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

from app.models import (
    db,
    Student,
    Subject,
    LearningOutcome,
    Assessment,
    RubricFeedback,
    MasteryScore,
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
