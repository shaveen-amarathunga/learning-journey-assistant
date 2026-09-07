"""
Database Seeder
===============
Reads the JSON files from /data (produced by mock_moodle_generator.py)
and loads them into the database.

Usage:
  python scripts/seed_db.py            # normal seed (fails if data exists)
  python scripts/seed_db.py --reset    # wipe and reseed
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

# Allow imports from the app package
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import create_app
from app.models import (
    db,
    Student,
    Subject,
    LearningOutcome,
    Assessment,
    RubricFeedback,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_json(filename: str):
    """Read a JSON file from the /data directory."""
    path = DATA_DIR / filename
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path}. Run: python scripts/mock_moodle_generator.py first."
        )
    with open(path) as f:
        return json.load(f)


def parse_dt(iso_string: str | None):
    """Convert an ISO datetime string to a datetime object (or None)."""
    if not iso_string:
        return None
    return datetime.fromisoformat(iso_string)


def seed_subjects():
    data = load_json("subjects.json")
    for row in data:
        db.session.add(Subject(
            code=row["code"],
            name=row["name"],
            description=row["description"],
        ))
    print(f"  ✓ Seeded {len(data)} subject(s)")


def seed_learning_outcomes():
    """LOs belong to a subject. We only have one subject (CSE3CAP) so all LOs
    attach to it. Returns a dict mapping lo_code → LO id for later use."""
    data = load_json("learning_outcomes.json")
    subject_code = "CSE3CAP"
    lo_code_to_id = {}

    for row in data:
        lo = LearningOutcome(
            subject_code=subject_code,
            lo_code=row["lo_code"],
            description=row["description"],
        )
        db.session.add(lo)
        db.session.flush()   # forces the DB to assign an id we can use below
        lo_code_to_id[row["lo_code"]] = lo.id

    print(f"  ✓ Seeded {len(data)} learning outcome(s)")
    return lo_code_to_id


def seed_students():
    data = load_json("students.json")
    for row in data:
        db.session.add(Student(
            id=row["id"],
            name=row["name"],
            email=row["email"],
        ))
    print(f"  ✓ Seeded {len(data)} student(s)")


def seed_assessments():
    """Assessments belong to a subject (CSE3CAP)."""
    data = load_json("assessments.json")
    for row in data:
        db.session.add(Assessment(
            id=row["id"],
            subject_code="CSE3CAP",
            title=row["title"],
            max_marks=row["max_marks"],
            due_date=parse_dt(row["due_date"]),
        ))
    print(f"  ✓ Seeded {len(data)} assessment(s)")


def seed_rubric_feedback(lo_code_to_id: dict):
    """Each feedback record references a student, an assessment, and an LO
    (via the lo_code in the JSON, which we translate to lo_id)."""
    data = load_json("rubric_feedback.json")
    for row in data:
        db.session.add(RubricFeedback(
            id=row["id"],
            assessment_id=row["assessment_id"],
            student_id=row["student_id"],
            lo_id=lo_code_to_id[row["lo_code"]],
            comment=row["comment"],
            score=row["score"],
            created_at=parse_dt(row["created_at"]),
        ))
    print(f"  ✓ Seeded {len(data)} rubric feedback record(s)")


def reset_database():
    """Wipe all tables and rebuild them empty."""
    print("  ⚠ Resetting database (wiping all data)...")
    db.drop_all()
    db.create_all()


def is_already_seeded() -> bool:
    """Check if the database already has data — prevents accidental double-seed."""
    return db.session.query(Subject).count() > 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true",
                        help="Wipe existing data before seeding")
    args = parser.parse_args()

    app = create_app()

    with app.app_context():
        print("\n🌱 Seeding database...\n")

        if args.reset:
            reset_database()
        elif is_already_seeded():
            print("  ❌ Database already contains data.")
            print("     Run with --reset to wipe and reseed:")
            print("     python scripts/seed_db.py --reset\n")
            return

        # Order matters — respect foreign-key dependencies
        seed_subjects()
        lo_code_to_id = seed_learning_outcomes()
        seed_students()
        seed_assessments()
        seed_rubric_feedback(lo_code_to_id)

        db.session.commit()

        print("\n✅ Database seeded successfully!\n")

        # Quick summary
        print("Summary:")
        print(f"  Students:         {db.session.query(Student).count()}")
        print(f"  Subjects:         {db.session.query(Subject).count()}")
        print(f"  Learning Outcomes:{db.session.query(LearningOutcome).count()}")
        print(f"  Assessments:      {db.session.query(Assessment).count()}")
        print(f"  Rubric Feedback:  {db.session.query(RubricFeedback).count()}")
        print()


if __name__ == "__main__":
    main()