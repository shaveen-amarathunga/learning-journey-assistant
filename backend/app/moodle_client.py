"""
Moodle Client
=============
Reads data from Moodle. Currently uses a MOCK implementation that reads
JSON files from /data. When Sleesha's real Moodle is ready, we swap the
MockMoodleClient for a RealMoodleClient — the interface stays identical.

This is called the Adapter pattern. Every downstream consumer (the
mastery calculator, the API routes) uses the same 5 methods regardless
of whether we're talking to files or a real Moodle server.
"""
import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from app.config import Config


# ---------------------------------------------------------------------------
# Abstract interface — defines what a Moodle client must be able to do
# ---------------------------------------------------------------------------
class MoodleClient(ABC):
    """The contract every Moodle client must fulfil."""

    @abstractmethod
    def get_subjects(self) -> list[dict]: ...

    @abstractmethod
    def get_learning_outcomes(self, subject_code: str) -> list[dict]: ...

    @abstractmethod
    def get_students(self) -> list[dict]: ...

    @abstractmethod
    def get_assessments(self, subject_code: str) -> list[dict]: ...

    @abstractmethod
    def get_feedback_for_student(self, student_id: str) -> list[dict]: ...


# ---------------------------------------------------------------------------
# Mock implementation — reads JSON files
# ---------------------------------------------------------------------------
class MockMoodleClient(MoodleClient):
    """Pretends to be Moodle. Reads from /data JSON files."""

    def __init__(self, data_dir: Optional[Path] = None):
        self.data_dir = data_dir or Config.MOCK_MOODLE_DATA_DIR
        if not self.data_dir.exists():
            raise FileNotFoundError(
                f"Mock Moodle data directory not found: {self.data_dir}\n"
                f"Run: python scripts/mock_moodle_generator.py"
            )

    def _load(self, filename: str) -> list[dict]:
        path = self.data_dir / filename
        with open(path) as f:
            return json.load(f)

    def get_subjects(self) -> list[dict]:
        """Simulates Moodle's core_course_get_courses endpoint."""
        return self._load("subjects.json")

    def get_learning_outcomes(self, subject_code: str) -> list[dict]:
        """Moodle stores LOs as course competencies. We simplify here."""
        all_los = self._load("learning_outcomes.json")
        # In this mock, all LOs belong to the same subject
        return all_los

    def get_students(self) -> list[dict]:
        """Simulates Moodle's core_enrol_get_enrolled_users endpoint."""
        return self._load("students.json")

    def get_assessments(self, subject_code: str) -> list[dict]:
        """Simulates Moodle's mod_assign_get_assignments endpoint."""
        return self._load("assessments.json")

    def get_feedback_for_student(self, student_id: str) -> list[dict]:
        """Simulates Moodle's mod_assign_get_grades endpoint filtered by user."""
        all_feedback = self._load("rubric_feedback.json")
        return [f for f in all_feedback if f["student_id"] == student_id]


# ---------------------------------------------------------------------------
# Placeholder for real Moodle client — Sleesha will fill this in later
# ---------------------------------------------------------------------------
class RealMoodleClient(MoodleClient):
    """Real Moodle REST API client. Not implemented — see MockMoodleClient."""

    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token

    def get_subjects(self) -> list[dict]:
        raise NotImplementedError("Real Moodle client not implemented yet")

    def get_learning_outcomes(self, subject_code: str) -> list[dict]:
        raise NotImplementedError("Real Moodle client not implemented yet")

    def get_students(self) -> list[dict]:
        raise NotImplementedError("Real Moodle client not implemented yet")

    def get_assessments(self, subject_code: str) -> list[dict]:
        raise NotImplementedError("Real Moodle client not implemented yet")

    def get_feedback_for_student(self, student_id: str) -> list[dict]:
        raise NotImplementedError("Real Moodle client not implemented yet")


# ---------------------------------------------------------------------------
# Factory — returns the right client based on config
# ---------------------------------------------------------------------------
def get_moodle_client() -> MoodleClient:
    """Return the active Moodle client.

    Later, this will check an env var like USE_REAL_MOODLE=true to switch.
    For now, always returns the mock.
    """
    return MockMoodleClient()