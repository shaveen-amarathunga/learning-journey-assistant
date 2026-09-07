"""Tests for the database models."""
from app.models import Student, Subject, LearningOutcome, RubricFeedback, MasteryScore


class TestStudentModel:

    def test_student_can_be_created(self, db):
        student = Student(id="S100", name="Test User", email="test@test.edu")
        db.session.add(student)
        db.session.commit()

        found = db.session.get(Student, "S100")
        assert found is not None
        assert found.name == "Test User"

    def test_student_to_dict_returns_correct_fields(self, db):
        student = Student(id="S101", name="Jane", email="jane@test.edu")
        db.session.add(student)
        db.session.commit()

        result = student.to_dict()
        assert result["id"] == "S101"
        assert result["name"] == "Jane"
        assert result["email"] == "jane@test.edu"
        assert "enrolled_at" in result


class TestSubjectModel:

    def test_subject_stores_all_fields(self, db):
        subject = Subject(code="TEST101", name="Test Subject", description="A course")
        db.session.add(subject)
        db.session.commit()

        found = db.session.get(Subject, "TEST101")
        assert found.name == "Test Subject"
        assert found.description == "A course"


class TestRelationships:

    def test_student_has_feedback_relationship(self, sample_data, db):
        aisha = db.session.get(Student, "S001")
        assert len(aisha.feedback) == 2

    def test_subject_has_learning_outcomes_relationship(self, sample_data, db):
        subject = db.session.get(Subject, "CSE3CAP")
        assert len(subject.learning_outcomes) == 2


class TestMasteryScoreConstraint:

    def test_cannot_have_duplicate_mastery_score_for_same_student_and_lo(self, sample_data, db):
        """The uq_student_lo constraint should prevent duplicates."""
        from sqlalchemy.exc import IntegrityError

        m1 = MasteryScore(student_id="S001", lo_id=sample_data["lo1_id"], score=80)
        db.session.add(m1)
        db.session.commit()

        # Try to add another for the same student+LO
        m2 = MasteryScore(student_id="S001", lo_id=sample_data["lo1_id"], score=90)
        db.session.add(m2)

        try:
            db.session.commit()
            assert False, "Expected IntegrityError but commit succeeded"
        except IntegrityError:
            db.session.rollback()
            assert True