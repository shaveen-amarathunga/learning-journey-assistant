"""Tests for the mastery calculation logic."""
from app.mastery_calculator import calculate_mastery_for_student
from app.models import MasteryScore


class TestMasteryCalculation:

    def test_calculation_produces_scores_for_all_los(self, app, sample_data):
        with app.app_context():
            result = calculate_mastery_for_student("S001")
            assert len(result["scores"]) == 2   # LO1 and LO2
            assert result["feedback_records_used"] == 2

    def test_strong_student_gets_high_scores(self, app, sample_data):
        with app.app_context():
            result = calculate_mastery_for_student("S001")
            # Aisha has scores of 90 and 88 — mastery should reflect that
            for score_entry in result["scores"]:
                assert score_entry["score"] > 80

    def test_weak_student_gets_low_scores(self, app, sample_data):
        with app.app_context():
            result = calculate_mastery_for_student("S002")
            # Ben has scores of 40 and 35 — mastery should reflect that
            for score_entry in result["scores"]:
                assert score_entry["score"] < 50

    def test_calculation_writes_to_database(self, app, sample_data):
        with app.app_context():
            calculate_mastery_for_student("S001")
            saved = MasteryScore.query.filter_by(student_id="S001").all()
            assert len(saved) == 2

    def test_calculation_updates_existing_scores(self, app, sample_data):
        with app.app_context():
            # First calculation
            calculate_mastery_for_student("S001")
            first_count = MasteryScore.query.count()

            # Second calculation should NOT create duplicates
            calculate_mastery_for_student("S001")
            second_count = MasteryScore.query.count()

            assert first_count == second_count

    def test_student_with_no_feedback_returns_empty_scores(self, app, db, sample_data):
        from app.models import Student
        with app.app_context():
            new_student = Student(id="S999", name="Empty", email="e@t.edu")
            db.session.add(new_student)
            db.session.commit()

            result = calculate_mastery_for_student("S999")
            assert result["scores"] == []
            assert result["feedback_records_used"] == 0