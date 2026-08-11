"""
Mastery Calculator
==================
Computes a 0-100 mastery score per learning outcome from a student's
rubric feedback.

Algorithm (v1 — deterministic, defensible):
  For each learning outcome:
    score = weighted average of all rubric scores for that LO
    weight = 1.0 for the most recent assessment, 0.7 for older ones
             (recent performance matters more than early performance)

This is intentionally simple and transparent. Shaveen's AI layer will
enhance this in a later sprint, but this baseline gives us real
numbers to work with today.
"""
from collections import defaultdict
from datetime import datetime

from app.models import db, LearningOutcome, RubricFeedback, MasteryScore


# Weight applied to older feedback records (relative to the most recent)
OLDER_ASSESSMENT_WEIGHT = 0.7


def calculate_mastery_for_student(student_id: str) -> dict:
    """Compute mastery scores per LO for a student, save to DB, return summary.

    Returns:
        {
            "student_id": "S001",
            "scores": [{"lo_code": "LO1", "score": 89.4}, ...],
            "feedback_records_used": 10,
        }
    """
    # Get all feedback for this student, joined with LO info
    feedback_rows = (
        db.session.query(RubricFeedback, LearningOutcome)
        .join(LearningOutcome, RubricFeedback.lo_id == LearningOutcome.id)
        .filter(RubricFeedback.student_id == student_id)
        .all()
    )

    if not feedback_rows:
        return {
            "student_id": student_id,
            "scores": [],
            "feedback_records_used": 0,
            "message": "No feedback found for this student",
        }

    # Group feedback by LO, tracking each record's date so we can weight it
    lo_feedback: dict[int, list] = defaultdict(list)
    for fb, lo in feedback_rows:
        lo_feedback[lo.id].append({
            "score": fb.score,
            "date": fb.created_at or datetime.min,
            "lo_code": lo.lo_code,
        })

    # For each LO, compute weighted average
    computed_scores = []
    for lo_id, records in lo_feedback.items():
        # Sort so the most recent is first
        records.sort(key=lambda r: r["date"], reverse=True)

        # Apply weights: newest = 1.0, all others = OLDER_ASSESSMENT_WEIGHT
        weighted_sum = 0.0
        weight_total = 0.0
        for i, rec in enumerate(records):
            weight = 1.0 if i == 0 else OLDER_ASSESSMENT_WEIGHT
            weighted_sum += rec["score"] * weight
            weight_total += weight

        final_score = round(weighted_sum / weight_total, 1) if weight_total > 0 else 0.0
        computed_scores.append({
            "lo_id": lo_id,
            "lo_code": records[0]["lo_code"],
            "score": final_score,
        })

    # Upsert into the database
    for entry in computed_scores:
        existing = MasteryScore.query.filter_by(
            student_id=student_id, lo_id=entry["lo_id"]
        ).first()

        if existing:
            existing.score = entry["score"]
        else:
            db.session.add(MasteryScore(
                student_id=student_id,
                lo_id=entry["lo_id"],
                score=entry["score"],
            ))

    db.session.commit()

    return {
        "student_id": student_id,
        "scores": [
            {"lo_code": s["lo_code"], "score": s["score"]}
            for s in sorted(computed_scores, key=lambda x: x["lo_code"])
        ],
        "feedback_records_used": len(feedback_rows),
    }


def calculate_mastery_for_all_students() -> list[dict]:
    """Bulk recalculate for every student in the database."""
    from app.models import Student
    results = []
    for student in Student.query.order_by(Student.id).all():
        result = calculate_mastery_for_student(student.id)
        results.append(result)
    return results