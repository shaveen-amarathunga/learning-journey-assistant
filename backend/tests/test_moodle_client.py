"""Tests for the Moodle client (mock implementation)."""
from app.moodle_client import MockMoodleClient, get_moodle_client, MoodleClient


class TestMoodleClient:

    def test_factory_returns_moodle_client_instance(self):
        client = get_moodle_client()
        assert isinstance(client, MoodleClient)

    def test_get_subjects_returns_list(self):
        client = MockMoodleClient()
        subjects = client.get_subjects()
        assert isinstance(subjects, list)
        assert len(subjects) >= 1

    def test_subjects_have_required_fields(self):
        client = MockMoodleClient()
        for subject in client.get_subjects():
            assert "code" in subject
            assert "name" in subject

    def test_get_students_returns_list(self):
        client = MockMoodleClient()
        students = client.get_students()
        assert isinstance(students, list)
        assert len(students) >= 1

    def test_feedback_can_be_filtered_by_student(self):
        client = MockMoodleClient()
        feedback = client.get_feedback_for_student("S001")
        assert all(f["student_id"] == "S001" for f in feedback)

    def test_feedback_for_unknown_student_returns_empty(self):
        client = MockMoodleClient()
        feedback = client.get_feedback_for_student("S999")
        assert feedback == []
        