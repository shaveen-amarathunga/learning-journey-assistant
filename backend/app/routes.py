"""
API Routes
==========

All HTTP endpoints for the Learning Journey Assistant backend.

Endpoint conventions:
  - All endpoints live under /api/...
  - All responses are JSON
  - Success:  200 OK with {"data": ...}
  - Created:  201 Created with {"data": ...}
  - Error:    4xx/5xx with {"error": "message"}
"""

from datetime import datetime

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from app.models import (
    db,
    Student,
    Subject,
    LearningOutcome,
    Assessment,
    RubricFeedback,
    MasteryScore,
    QuizAttempt,
)
from app.mastery_calculator import (
    calculate_mastery_for_student,
    calculate_mastery_for_all_students,
    weighted_mastery,
)
from app.moodle_client import get_moodle_client
from app.authorization import require_self
from app.feedback_analyzer import get_student_knowledge_gaps


api = Blueprint("api", __name__, url_prefix="/api")


# ===========================================================================
# HEALTH & INFO
# ===========================================================================

@api.route("/health", methods=["GET"])
def health_check():
    """Health check — proves API and database are alive."""
    try:
        student_count = db.session.query(Student).count()
        return jsonify({
            "status": "ok",
            "message": "Learning Journey Assistant API is running",
            "database": "connected",
            "student_count": student_count,
        }), 200
    except SQLAlchemyError as e:
        return jsonify({
            "status": "error",
            "error": str(e),
        }), 500


@api.route("/info", methods=["GET"])
def system_info():
    """Summary counts of everything in the system."""
    return jsonify({
        "data": {
            "students": db.session.query(Student).count(),
            "subjects": db.session.query(Subject).count(),
            "learning_outcomes": db.session.query(LearningOutcome).count(),
            "assessments": db.session.query(Assessment).count(),
            "feedback_records": db.session.query(RubricFeedback).count(),
            "mastery_scores": db.session.query(MasteryScore).count(),
        }
    }), 200


# ===========================================================================
# STUDENTS
# ===========================================================================

@api.route("/students", methods=["GET"])
def list_students():
    """List all students. Frontend uses this to populate the student picker."""
    students = Student.query.order_by(Student.id).all()

    return jsonify({
        "data": [student.to_dict() for student in students],
        "count": len(students),
    }), 200


@api.route("/students/<string:student_id>", methods=["GET"])
@require_self()
def get_student(student_id):
    """Full profile for one student, including counts of related records."""
    student = db.session.get(Student, student_id)

    if not student:
        return jsonify({
            "error": f"Student {student_id} not found"
        }), 404

    return jsonify({
        "data": {
            **student.to_dict(),
            "feedback_count": len(student.feedback),
            "mastery_count": len(student.mastery_scores),
        }
    }), 200


@api.route("/students/<string:student_id>/feedback", methods=["GET"])
@require_self()
def get_student_feedback(student_id):
    """
    Return all rubric feedback for one student.

    Optional:
        ?lo_code=LO1
    """

    student = db.session.get(Student, student_id)

    if not student:
        return jsonify({
            "error": f"Student {student_id} not found"
        }), 404

    lo_code = request.args.get("lo_code")

    feedback_query = RubricFeedback.query.filter_by(
        student_id=student_id
    )

    if lo_code:
        feedback_query = feedback_query.join(
            LearningOutcome
        ).filter(
            LearningOutcome.lo_code == lo_code
        )

    feedback = feedback_query.order_by(
        RubricFeedback.created_at.desc()
    ).all()

    return jsonify({
        "data": [item.to_dict() for item in feedback],
        "count": len(feedback),
        "student_id": student_id,
    }), 200


# ===========================================================================
# MASTERY
# ===========================================================================

@api.route("/students/<string:student_id>/mastery", methods=["GET"])
@require_self()
def get_student_mastery(student_id):
    """
    Return current mastery scores for a student.
    """

    student = db.session.get(Student, student_id)

    if not student:
        return jsonify({
            "error": f"Student {student_id} not found"
        }), 404

    scores = MasteryScore.query.filter_by(
        student_id=student_id
    ).all()

    return jsonify({
        "data": [score.to_dict() for score in scores],
        "count": len(scores),
        "student_id": student_id,
    }), 200


@api.route("/students/<string:student_id>/mastery", methods=["POST"])
@require_self()
def upsert_student_mastery(student_id):
    """
    Create or update mastery scores for a student.

    Expected body:

    {
        "scores": [
            {"lo_code": "LO1", "score": 85.5},
            {"lo_code": "LO2", "score": 62.0}
        ]
    }
    """

    student = db.session.get(Student, student_id)

    if not student:
        return jsonify({
            "error": f"Student {student_id} not found"
        }), 404

    body = request.get_json(silent=True)

    if not body or "scores" not in body:
        return jsonify({
            "error": "Request body must include 'scores' array"
        }), 400

    scores_payload = body["scores"]

    if not isinstance(scores_payload, list) or len(scores_payload) == 0:
        return jsonify({
            "error": "'scores' must be a non-empty array"
        }), 400

    updated = []
    created = []

    try:
        for entry in scores_payload:
            lo_code = entry.get("lo_code")
            score_value = entry.get("score")

            if not lo_code or score_value is None:
                return jsonify({
                    "error":
                        f"Each score needs 'lo_code' and 'score'. Got: {entry}"
                }), 400

            if not isinstance(score_value, (int, float)):
                return jsonify({
                    "error": "Score must be numeric"
                }), 400

            if not 0 <= score_value <= 100:
                return jsonify({
                    "error":
                        f"Score must be between 0 and 100. Got: {score_value}"
                }), 400

            lo = LearningOutcome.query.filter_by(
                lo_code=lo_code
            ).first()

            if not lo:
                return jsonify({
                    "error":
                        f"Learning outcome '{lo_code}' not found"
                }), 404

            existing = MasteryScore.query.filter_by(
                student_id=student_id,
                lo_id=lo.id
            ).first()

            if existing:
                existing.score = score_value
                updated.append(lo_code)

            else:
                db.session.add(
                    MasteryScore(
                        student_id=student_id,
                        lo_id=lo.id,
                        score=score_value,
                    )
                )
                created.append(lo_code)

        db.session.commit()

        status_code = 201 if created else 200

        return jsonify({
            "data": {
                "student_id": student_id,
                "created": created,
                "updated": updated,
                "total_scores_processed": len(scores_payload),
            }
        }), status_code

    except SQLAlchemyError as error:
        db.session.rollback()

        return jsonify({
            "error": f"Database error: {str(error)}"
        }), 500


# ===========================================================================
# SUBJECTS
# ===========================================================================

@api.route("/subjects", methods=["GET"])
def list_subjects():
    """List all subjects."""

    subjects = Subject.query.order_by(
        Subject.code
    ).all()

    return jsonify({
        "data": [subject.to_dict() for subject in subjects],
        "count": len(subjects),
    }), 200


@api.route("/subjects/<string:code>", methods=["GET"])
def get_subject(code):
    """
    Return a subject including learning outcomes and assessments.
    """

    subject = db.session.get(Subject, code)

    if not subject:
        return jsonify({
            "error": f"Subject {code} not found"
        }), 404

    return jsonify({
        "data": {
            **subject.to_dict(),
            "learning_outcomes": [
                lo.to_dict()
                for lo in subject.learning_outcomes
            ],
            "assessments": [
                assessment.to_dict()
                for assessment in subject.assessments
            ],
        }
    }), 200


# ===========================================================================
# MASTERY CALCULATION
# ===========================================================================

@api.route(
    "/students/<string:student_id>/mastery/recalculate",
    methods=["POST"]
)
@require_self()
def recalculate_student_mastery(student_id):
    """
    Recalculate mastery scores for one student.
    """

    student = db.session.get(Student, student_id)

    if not student:
        return jsonify({
            "error": f"Student {student_id} not found"
        }), 404

    try:
        result = calculate_mastery_for_student(
            student_id
        )

        return jsonify({
            "data": result
        }), 200

    except SQLAlchemyError as error:
        db.session.rollback()

        return jsonify({
            "error": f"Database error: {str(error)}"
        }), 500


@api.route("/mastery/recalculate-all", methods=["POST"])
def recalculate_all_mastery():
    """
    Recalculate mastery scores for all students.
    """

    try:
        results = calculate_mastery_for_all_students()

        return jsonify({
            "data": {
                "students_processed": len(results),
                "results": results,
            }
        }), 200

    except SQLAlchemyError as error:
        db.session.rollback()

        return jsonify({
            "error": f"Database error: {str(error)}"
        }), 500


# ===========================================================================
# MOODLE INTEGRATION
# ===========================================================================

@api.route("/moodle/subjects", methods=["GET"])
def moodle_subjects():
    """
    Read subjects from Moodle.
    """

    client = get_moodle_client()

    return jsonify({
        "data": client.get_subjects(),
        "source": "moodle",
    }), 200


@api.route(
    "/moodle/students/<string:student_id>/feedback",
    methods=["GET"]
)
@require_self()
def moodle_student_feedback(student_id):
    """
    Read student feedback directly from Moodle.
    """

    client = get_moodle_client()

    feedback = client.get_feedback_for_student(
        student_id
    )

    return jsonify({
        "data": feedback,
        "count": len(feedback),
        "source": "moodle",
    }), 200


# ===========================================================================
# QUIZ ATTEMPTS
# ===========================================================================

@api.route(
    "/students/<string:student_id>/quiz-attempts",
    methods=["GET"]
)
@require_self()
def get_quiz_attempts(student_id):
    """
    Return all completed quiz attempts for a student.
    """

    student = db.session.get(
        Student,
        student_id
    )

    if not student:
        return jsonify({
            "error": "Student not found"
        }), 404

    attempts = QuizAttempt.query.filter_by(
        student_id=student_id
    ).all()

    return jsonify({
        "data": [
            attempt.to_dict()
            for attempt in attempts
        ],
        "count": len(attempts),
    }), 200


@api.route(
    "/students/<string:student_id>/quiz-attempts",
    methods=["POST"]
)
@require_self()
def create_quiz_attempt(student_id):
    """
    Save a completed quiz attempt and update mastery.
    """

    data = request.get_json(silent=True) or {}

    lo_code = data.get("lo_code")
    score = data.get("score")
    total_questions = data.get(
        "total_questions"
    )

    if (
        not lo_code
        or score is None
        or total_questions is None
    ):
        return jsonify({
            "error":
                "lo_code, score and total_questions are required"
        }), 400

    if (
        not isinstance(score, (int, float))
        or not isinstance(total_questions, (int, float))
    ):
        return jsonify({
            "error":
                "score and total_questions must be numeric"
        }), 400

    if (
        total_questions <= 0
        or score < 0
        or score > total_questions
    ):
        return jsonify({
            "error": "Invalid quiz score"
        }), 400

    student = db.session.get(
        Student,
        student_id
    )

    if not student:
        return jsonify({
            "error": "Student not found"
        }), 404

    lo = LearningOutcome.query.filter_by(
        lo_code=lo_code
    ).first()

    if not lo:
        return jsonify({
            "error": "Learning outcome not found"
        }), 404

    mastery = MasteryScore.query.filter_by(
        student_id=student_id,
        lo_id=lo.id
    ).first()

    mastery_before = (
        mastery.score
        if mastery
        else 0.0
    )

    quiz_percentage = (
        score / total_questions
    ) * 100

    mastery_after = round(
        mastery_before
        + (
            quiz_percentage
            - mastery_before
        ) * 0.25,
        1
    )

    mastery_after = max(
        0.0,
        min(100.0, mastery_after)
    )

    try:
        if mastery:
            mastery.score = mastery_after

        else:
            mastery = MasteryScore(
                student_id=student_id,
                lo_id=lo.id,
                score=mastery_after,
            )

            db.session.add(mastery)

        attempt = QuizAttempt(
            student_id=student_id,
            lo_id=lo.id,
            score=score,
            total_questions=total_questions,
            mastery_before=mastery_before,
            mastery_after=mastery_after,
        )

        db.session.add(attempt)
        db.session.commit()

        return jsonify({
            "data": attempt.to_dict()
        }), 201

    except SQLAlchemyError as error:
        db.session.rollback()

        return jsonify({
            "error": f"Database error: {str(error)}"
        }), 500


# ===========================================================================
# MASTERY HISTORY (PROGRESS TRENDS)
# ===========================================================================

@api.route(
    "/students/<string:student_id>/mastery/history",
    methods=["GET"]
)
@require_self()
def get_mastery_history(student_id):
    """
    Real progress over time for each learning outcome.

    One point after each marked assessment (mastery calculated from the
    feedback received up to that assessment), then one point after each
    completed quiz.
    """

    student = db.session.get(
        Student,
        student_id
    )

    if not student:
        return jsonify({
            "error": "Student not found"
        }), 404

    feedback_rows = (
        db.session.query(RubricFeedback, Assessment, LearningOutcome)
        .join(Assessment, RubricFeedback.assessment_id == Assessment.id)
        .join(LearningOutcome, RubricFeedback.lo_id == LearningOutcome.id)
        .filter(RubricFeedback.student_id == student_id)
        .all()
    )

    attempts = (
        QuizAttempt.query.filter_by(student_id=student_id)
        .order_by(QuizAttempt.completed_at)
        .all()
    )

    outcomes = {}

    for feedback, assessment, lo in feedback_rows:
        entry = outcomes.setdefault(lo.id, {
            "lo_code": lo.lo_code,
            "lo_description": lo.description,
            "feedback": [],
        })
        entry["feedback"].append((
            assessment.due_date or feedback.created_at or datetime.min,
            assessment,
            feedback.score,
        ))

    history = []

    for lo_id, entry in outcomes.items():
        entry["feedback"].sort(key=lambda item: item[0])
        points = []

        for index, (when, assessment, _) in enumerate(entry["feedback"]):
            scores_so_far = [item[2] for item in entry["feedback"][: index + 1]]
            points.append({
                "label": f"Assessment {index + 1}",
                "title": assessment.title,
                "kind": "assessment",
                "date": when.isoformat() if when != datetime.min else None,
                "value": weighted_mastery(list(reversed(scores_so_far))),
            })

        quiz_number = 0
        for attempt in attempts:
            if attempt.lo_id != lo_id:
                continue
            quiz_number += 1
            points.append({
                "label": f"Quiz {quiz_number}",
                "title": f"Practice quiz ({attempt.score}/{attempt.total_questions} correct)",
                "kind": "quiz",
                "date": attempt.completed_at.isoformat() if attempt.completed_at else None,
                "value": round(attempt.mastery_after, 1),
            })

        history.append({
            "lo_code": entry["lo_code"],
            "lo_description": entry["lo_description"],
            "points": points,
        })

    history.sort(key=lambda item: item["lo_code"])

    return jsonify({
        "data": history,
        "student_id": student_id,
    }), 200


# ===========================================================================
# ADAPTIVE QUIZ
# ===========================================================================

@api.route(
    "/students/<string:student_id>/quiz",
    methods=["GET"]
)
@require_self()
def get_adaptive_quiz(student_id):
    """
    Generate a practice quiz for one learning outcome (?lo_code=LO1).

    Questions are written by the LLM, grounded in the learning outcome,
    the student's own feedback and knowledge gaps, and the difficulty
    adapts to their current mastery.
    """

    lo_code = (request.args.get("lo_code") or "").upper()

    if not lo_code:
        return jsonify({
            "error": "lo_code is required"
        }), 400

    lo = LearningOutcome.query.filter_by(
        lo_code=lo_code
    ).first()

    if not lo:
        return jsonify({
            "error": "Learning outcome not found"
        }), 404

    mastery = MasteryScore.query.filter_by(
        student_id=student_id,
        lo_id=lo.id
    ).first()

    feedback = (
        RubricFeedback.query.filter_by(student_id=student_id, lo_id=lo.id)
        .order_by(RubricFeedback.created_at.desc())
        .all()
    )

    try:
        gaps = get_student_knowledge_gaps(
            "data/rubric_feedback.json",
            student_id
        )["knowledge_gaps"]
    except Exception:
        gaps = []

    gap_names = sorted({
        gap["knowledge_gap"]
        for gap in gaps
        if gap["lo_code"] == lo_code
    })

    try:
        from app.llm_service import generate_adaptive_quiz

        quiz = generate_adaptive_quiz({
            "subject_name": lo.subject.name if lo.subject else "",
            "lo_code": lo.lo_code,
            "lo_description": lo.description,
            "mastery": round(mastery.score, 1) if mastery else 0,
            "feedback": [item.comment for item in feedback if item.comment],
            "knowledge_gaps": gap_names,
        })

    except Exception as error:
        return jsonify({
            "error": f"Could not generate an AI quiz right now: {error}"
        }), 503

    return jsonify({
        "data": {
            "lo_code": lo.lo_code,
            "lo_description": lo.description,
            "mastery": round(mastery.score, 1) if mastery else 0,
            "difficulty": quiz["difficulty"],
            "focus_areas": gap_names,
            "questions": quiz["questions"],
            "source": "ai",
        }
    }), 200


# ===========================================================================
# NLP KNOWLEDGE GAP ANALYSIS
# ===========================================================================

@api.route(
    "/students/<string:student_id>/knowledge-gaps",
    methods=["GET"]
)
@require_self()
def get_knowledge_gaps(student_id):
    """
    Analyse rubric feedback and identify knowledge gaps.
    """

    try:
        result = get_student_knowledge_gaps(
            "data/rubric_feedback.json",
            student_id
        )

        return jsonify({
            "data": result
        }), 200

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500


# ===========================================================================
# PERSONALISED RECOMMENDATIONS
# ===========================================================================

@api.route(
    "/students/<string:student_id>/recommendations",
    methods=["GET"]
)
@require_self()
def get_personalised_recommendations(student_id):
    """
    Generate personalised recommendations from identified
    knowledge gaps.
    """

    try:
        from app.recommendation_engine import (
            generate_personalised_recommendations,
        )

        result = get_student_knowledge_gaps(
            "data/rubric_feedback.json",
            student_id
        )

        recommendations = (
            generate_personalised_recommendations(
                result["knowledge_gaps"]
            )
        )

        return jsonify({
            "data": {
                "student_id": student_id,
                "recommendations": recommendations,
                "count": len(recommendations),
            }
        }), 200

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500


# ===========================================================================
# LLM / AI RECOMMENDATIONS
# ===========================================================================

@api.route(
    "/students/<string:student_id>/ai-recommendations",
    methods=["GET"]
)
@require_self()
def get_ai_recommendations(student_id):
    """
    Generate LLM-powered personalised learning recommendations
    using the student's identified knowledge gaps.
    """

    try:
        from app.llm_service import (
            generate_student_ai_recommendations,
        )

        result = get_student_knowledge_gaps(
            "data/rubric_feedback.json",
            student_id
        )

        recommendations = (
            generate_student_ai_recommendations(
                result["knowledge_gaps"]
            )
        )

        return jsonify({
            "data": {
                "student_id": student_id,
                "recommendations": recommendations,
                "count": len(recommendations),
            }
        }), 200

    except Exception as error:
        return jsonify({
            "error": str(error)
        }), 500