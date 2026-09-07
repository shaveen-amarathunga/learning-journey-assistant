"""
Shared pytest fixtures.
Every test can use these to get a fresh app + database.
"""
import pytest
from app import create_app
from app.models import db as _db, Student, Subject, LearningOutcome, Assessment, RubricFeedback


class TestConfig:
    """Config used ONLY during tests — separate in-memory DB."""
    SECRET_KEY = "test-secret"
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"   # in-memory, wiped each test
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    TESTING = True
    DEBUG = False


@pytest.fixture
def app():
    """Create a fresh Flask app with an empty in-memory DB for each test."""
    app = create_app(TestConfig)
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    """A Flask test client — lets us make fake HTTP requests to our API."""
    return app.test_client()


@pytest.fixture
def db(app):
    """The SQLAlchemy database, bound to the test app."""
    return _db


@pytest.fixture
def sample_data(app, db):
    """Load a small realistic dataset into the test DB.
    Uses the app_context provided by the app fixture."""
    # Subject
    subject = Subject(
        code="CSE3CAP",
        name="Capstone Project",
        description="Test subject",
    )
    db.session.add(subject)

    # Learning outcomes
    lo1 = LearningOutcome(subject_code="CSE3CAP", lo_code="LO1", description="Software engineering")
    lo2 = LearningOutcome(subject_code="CSE3CAP", lo_code="LO2", description="Teamwork")
    db.session.add_all([lo1, lo2])
    db.session.flush()

    # Students
    aisha = Student(id="S001", name="Aisha Khan", email="aisha@test.edu")
    ben = Student(id="S002", name="Ben Chen", email="ben@test.edu")
    db.session.add_all([aisha, ben])

    # Assessment
    assessment = Assessment(id=1, subject_code="CSE3CAP", title="Sprint 1", max_marks=100)
    db.session.add(assessment)

    # Feedback — Aisha strong, Ben weak
    feedback = [
        RubricFeedback(assessment_id=1, student_id="S001", lo_id=lo1.id, comment="Excellent design", score=90),
        RubricFeedback(assessment_id=1, student_id="S001", lo_id=lo2.id, comment="Great teamwork", score=88),
        RubricFeedback(assessment_id=1, student_id="S002", lo_id=lo1.id, comment="Weak structure", score=40),
        RubricFeedback(assessment_id=1, student_id="S002", lo_id=lo2.id, comment="Missing standups", score=35),
    ]
    db.session.add_all(feedback)

    db.session.commit()

    return {
        "subject": subject,
        "lo1_id": lo1.id,
        "lo2_id": lo2.id,
        "aisha_id": "S001",
        "ben_id": "S002",
    }
