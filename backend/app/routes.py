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
from flask import Blueprint, jsonify, request
from sqlalchemy.exc import SQLAlchemyError
from app.feedback_analyzer import get_student_knowledge_gaps

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
)
from app.moodle_client import get_moodle_client

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
        return jsonify({"status": "error", "error": str(e)}), 500


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
        "data": [s.to_dict() for s in students],
        "count": len(students),
    }), 200


@api.route("/students/<string:student_id>", methods=["GET"])
def get_student(student_id):
    """Full profile for one student, including counts of related records."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": f"Student {student_id} not found"}), 404

    return jsonify({
        "data": {
            **student.to_dict(),
            "feedback_count": len(student.feedback),
            "mastery_count": len(student.mastery_scores),
        }
    }), 200


@api.route("/students/<string:student_id>/feedback", methods=["GET"])
def get_student_feedback(student_id):
    """All rubric feedback for one student. Frontend shows this on the feedback detail screen."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": f"Student {student_id} not found"}), 404

    # Optional filter — ?lo_code=LO1 returns only feedback for that LO
    lo_code = request.args.get("lo_code")

    feedback_query = RubricFeedback.query.filter_by(student_id=student_id)
    if lo_code:
        # Join through LearningOutcome to filter by code
        feedback_query = feedback_query.join(LearningOutcome).filter(
            LearningOutcome.lo_code == lo_code
        )

    feedback = feedback_query.order_by(RubricFeedback.created_at.desc()).all()

    return jsonify({
        "data": [f.to_dict() for f in feedback],
        "count": len(feedback),
        "student_id": student_id,
    }), 200


@api.route("/students/<string:student_id>/mastery", methods=["GET"])
def get_student_mastery(student_id):
    """Current mastery scores per LO for one student. Frontend uses this for the Mastery Meter."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": f"Student {student_id} not found"}), 404

    scores = MasteryScore.query.filter_by(student_id=student_id).all()

    return jsonify({
        "data": [s.to_dict() for s in scores],
        "count": len(scores),
        "student_id": student_id,
    }), 200


@api.route("/students/<string:student_id>/mastery", methods=["POST"])
def upsert_student_mastery(student_id):
    """Create OR update mastery scores for a student.

    This is the endpoint Shaveen's AI layer calls after computing scores.

    Expected JSON body:
      {
        "scores": [
          {"lo_code": "LO1", "score": 85.5},
          {"lo_code": "LO2", "score": 62.0},
          ...
        ]
      }
    """
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": f"Student {student_id} not found"}), 404

    body = request.get_json(silent=True)
    if not body or "scores" not in body:
        return jsonify({"error": "Request body must include 'scores' array"}), 400

    scores_payload = body["scores"]
    if not isinstance(scores_payload, list) or len(scores_payload) == 0:
        return jsonify({"error": "'scores' must be a non-empty array"}), 400

    updated = []
    created = []

    try:
        for entry in scores_payload:
            lo_code = entry.get("lo_code")
            score_value = entry.get("score")

            # Validate input
            if not lo_code or score_value is None:
                return jsonify({
                    "error": f"Each score needs 'lo_code' and 'score'. Got: {entry}"
                }), 400

            if not (0 <= score_value <= 100):
                return jsonify({
                    "error": f"Score must be between 0 and 100. Got: {score_value}"
                }), 400

            # Find the LO
            lo = LearningOutcome.query.filter_by(lo_code=lo_code).first()
            if not lo:
                return jsonify({
                    "error": f"Learning outcome '{lo_code}' not found"
                }), 404

            # Upsert — update if exists, insert if not
            existing = MasteryScore.query.filter_by(
                student_id=student_id, lo_id=lo.id
            ).first()

            if existing:
                existing.score = score_value
                updated.append(lo_code)
            else:
                db.session.add(MasteryScore(
                    student_id=student_id,
                    lo_id=lo.id,
                    score=score_value,
                ))
                created.append(lo_code)

        db.session.commit()

        return jsonify({
            "data": {
                "student_id": student_id,
                "created": created,
                "updated": updated,
                "total_scores_processed": len(scores_payload),
            }
        }), 201

    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ===========================================================================
# SUBJECTS
# ===========================================================================

@api.route("/subjects", methods=["GET"])
def list_subjects():
    """List all subjects in the system."""
    subjects = Subject.query.order_by(Subject.code).all()
    return jsonify({
        "data": [s.to_dict() for s in subjects],
        "count": len(subjects),
    }), 200


@api.route("/subjects/<string:code>", methods=["GET"])
def get_subject(code):
    """Full details for one subject including its LOs and assessments."""
    subject = db.session.get(Subject, code)
    if not subject:
        return jsonify({"error": f"Subject {code} not found"}), 404

    return jsonify({
        "data": {
            **subject.to_dict(),
            "learning_outcomes": [lo.to_dict() for lo in subject.learning_outcomes],
            "assessments": [a.to_dict() for a in subject.assessments],
        }
    }), 200

# ===========================================================================
# MASTERY CALCULATION (reads from Moodle, writes mastery scores)
# ===========================================================================

@api.route("/students/<string:student_id>/mastery/recalculate", methods=["POST"])
def recalculate_student_mastery(student_id):
    """Recompute mastery scores for one student from their rubric feedback.
    Writes the results to the mastery_scores table."""
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": f"Student {student_id} not found"}), 404

    try:
        result = calculate_mastery_for_student(student_id)
        return jsonify({"data": result}), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@api.route("/mastery/recalculate-all", methods=["POST"])
def recalculate_all_mastery():
    """Bulk recompute mastery scores for every student in the database."""
    try:
        results = calculate_mastery_for_all_students()
        return jsonify({
            "data": {
                "students_processed": len(results),
                "results": results,
            }
        }), 200
    except SQLAlchemyError as e:
        db.session.rollback()
        return jsonify({"error": f"Database error: {str(e)}"}), 500


# ===========================================================================
# MOODLE INTEGRATION (proves we can read from Moodle)
# ===========================================================================

@api.route("/moodle/subjects", methods=["GET"])
def moodle_subjects():
    """Reads subjects from Moodle (currently the mock — swappable later)."""
    client = get_moodle_client()
    return jsonify({"data": client.get_subjects(), "source": "moodle"}), 200


@api.route("/moodle/students/<string:student_id>/feedback", methods=["GET"])
def moodle_student_feedback(student_id):
    """Reads a student's feedback directly from Moodle (bypasses our DB).
    Proves the Moodle integration works end-to-end."""
    client = get_moodle_client()
    feedback = client.get_feedback_for_student(student_id)
    return jsonify({
        "data": feedback,
        "count": len(feedback),
        "source": "moodle",
    }), 200



# ===========================================================================
# QUIZ ATTEMPTS
# ===========================================================================
@api.route("/students/<string:student_id>/quiz-attempts", methods=["GET"])
def get_quiz_attempts(student_id):
    """Return all completed quiz attempts for a student."""

    # Check student exists
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    # Get all quiz attempts for this student
    attempts = QuizAttempt.query.filter_by(
        student_id=student_id
    ).all()

    return jsonify({
        "data": [attempt.to_dict() for attempt in attempts],
        "count": len(attempts),
    }), 200

@api.route("/students/<string:student_id>/quiz-attempts", methods=["POST"])
def create_quiz_attempt(student_id):
    """Save a completed quiz attempt and update mastery for its learning outcome."""
    data = request.get_json() or {}

    lo_code = data.get("lo_code")
    score = data.get("score")
    total_questions = data.get("total_questions")

    # Validate request
    if not lo_code or score is None or total_questions is None:
        return jsonify({
            "error": "lo_code, score and total_questions are required"
        }), 400

    if total_questions <= 0 or score < 0 or score > total_questions:
        return jsonify({
            "error": "Invalid quiz score"
        }), 400

    # Find student
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Student not found"}), 404

    # Find learning outcome
    lo = LearningOutcome.query.filter_by(lo_code=lo_code).first()
    if not lo:
        return jsonify({"error": "Learning outcome not found"}), 404

    # Find current mastery
    mastery = MasteryScore.query.filter_by(
        student_id=student_id,
        lo_id=lo.id
    ).first()

    mastery_before = mastery.score if mastery else 0.0

    # Convert quiz result to percentage
    quiz_percentage = (score / total_questions) * 100

    # Quiz contributes 25% toward movement from current mastery
    mastery_after = round(
        mastery_before + (quiz_percentage - mastery_before) * 0.25,
        1
    )

    # Keep mastery between 0 and 100
    mastery_after = max(0.0, min(100.0, mastery_after))

    # Update/create mastery record
    if mastery:
        mastery.score = mastery_after
    else:
        mastery = MasteryScore(
            student_id=student_id,
            lo_id=lo.id,
            score=mastery_after,
        )
        db.session.add(mastery)

    # Save quiz attempt
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


@api.route("/students/<string:student_id>/knowledge-gaps", methods=["GET"])
def get_knowledge_gaps(student_id):
    """
    Analyse a student's rubric feedback and return
    NLP-identified knowledge gaps and recommendations.
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
