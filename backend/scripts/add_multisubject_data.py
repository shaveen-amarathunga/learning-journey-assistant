"""
Safely add multi-subject mock data to an existing database.

This script is intentionally non-destructive:
- It does not delete existing records.
- It does not reset the database.
- Existing subjects, learning outcomes and assessments are preserved.
- Running the script multiple times will not create duplicates.
"""

import json
from datetime import datetime
from pathlib import Path

from app import create_app
from app.models import db, Subject, LearningOutcome, Assessment


BACKEND_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BACKEND_DIR / "data"


def load_json(filename):
    path = DATA_DIR / filename

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def add_subjects():
    subjects = load_json("subjects.json")

    created = 0
    existing = 0

    for row in subjects:
        subject = db.session.get(Subject, row["code"])

        if subject:
            existing += 1
            continue

        db.session.add(
            Subject(
                code=row["code"],
                name=row["name"],
                description=row.get("description"),
            )
        )
        created += 1

    db.session.flush()

    return created, existing


def add_learning_outcomes():
    learning_outcomes = load_json("learning_outcomes.json")

    created = 0
    existing = 0

    for row in learning_outcomes:
        subject_code = row["subject_code"].strip().upper()
        lo_code = row["lo_code"].strip().upper()

        subject = db.session.get(Subject, subject_code)

        if not subject:
            raise ValueError(
                f"Subject {subject_code} does not exist for {lo_code}"
            )

        outcome = LearningOutcome.query.filter_by(
            subject_code=subject_code,
            lo_code=lo_code,
        ).first()

        if outcome:
            existing += 1
            continue

        db.session.add(
            LearningOutcome(
                subject_code=subject_code,
                lo_code=lo_code,
                description=row["description"],
            )
        )
        created += 1

    db.session.flush()

    return created, existing


def add_assessments():
    assessments = load_json("assessments.json")

    created = 0
    existing = 0

    for row in assessments:
        assessment_id = int(row["id"])
        subject_code = row["subject_code"].strip().upper()

        subject = db.session.get(Subject, subject_code)

        if not subject:
            raise ValueError(
                f"Subject {subject_code} does not exist "
                f"for assessment {assessment_id}"
            )

        assessment = db.session.get(
            Assessment,
            assessment_id,
        )

        if assessment:
            # Protect existing data. An existing ID must still belong
            # to the same subject represented in the JSON data.
            if assessment.subject_code != subject_code:
                raise ValueError(
                    f"Assessment ID {assessment_id} already belongs "
                    f"to {assessment.subject_code}, not {subject_code}"
                )

            existing += 1
            continue

        db.session.add(
            Assessment(
                id=assessment_id,
                subject_code=subject_code,
                title=row["title"],
                max_marks=row["max_marks"],
                due_date=datetime.fromisoformat(row["due_date"]) if row.get("due_date") else None,
            )
        )
        created += 1

    db.session.flush()

    return created, existing


def main():
    app = create_app()

    with app.app_context():
        try:
            subject_result = add_subjects()
            outcome_result = add_learning_outcomes()
            assessment_result = add_assessments()

            db.session.commit()

            print("Multi-subject data added successfully.")
            print(
                f"Subjects: {subject_result[0]} created, "
                f"{subject_result[1]} already existed"
            )
            print(
                f"Learning outcomes: {outcome_result[0]} created, "
                f"{outcome_result[1]} already existed"
            )
            print(
                f"Assessments: {assessment_result[0]} created, "
                f"{assessment_result[1]} already existed"
            )

        except Exception:
            db.session.rollback()
            raise


if __name__ == "__main__":
    main()
