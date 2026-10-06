"""Tests for email login, mastery history (progress trends) and the adaptive quiz."""

import pytest

from app import llm_service
from tests.test_api import get_auth_headers


class TestEmailLogin:

    def test_login_with_email(self, client, sample_data):
        response = client.post(
            "/api/auth/login",
            json={"email": "Aisha@Test.edu", "password": "password123"},
        )

        assert response.status_code == 200
        assert response.get_json()["student_id"] == "S001"

    def test_login_with_email_wrong_password(self, client, sample_data):
        response = client.post(
            "/api/auth/login",
            json={"email": "aisha@test.edu", "password": "nope"},
        )

        assert response.status_code == 401


class TestMasteryHistory:

    def test_history_has_a_point_per_assessment_and_quiz(self, client, sample_data):
        headers = get_auth_headers(client, "S001")
        client.post("/api/students/S001/mastery/recalculate", headers=headers)
        client.post(
            "/api/students/S001/quiz-attempts",
            json={"lo_code": "LO1", "score": 5, "total_questions": 5},
            headers=headers,
        )

        response = client.get("/api/students/S001/mastery/history", headers=headers)

        assert response.status_code == 200
        history = {item["lo_code"]: item for item in response.get_json()["data"]}
        lo1 = history["LO1"]["points"]
        assert [point["kind"] for point in lo1] == ["assessment", "quiz"]
        assert lo1[0]["value"] == 90
        assert lo1[1]["label"] == "Quiz 1"
        assert lo1[1]["value"] == 92.5  # 90 + (100 - 90) * 0.25
        assert [point["kind"] for point in history["LO2"]["points"]] == ["assessment"]

    def test_history_requires_ownership(self, client, sample_data):
        headers = get_auth_headers(client, "S001")

        response = client.get("/api/students/S002/mastery/history", headers=headers)

        assert response.status_code == 403


VALID_QUESTION = {
    "prompt": "What is a unit test?",
    "options": [
        {"key": "A", "text": "A test of one small piece of code"},
        {"key": "B", "text": "A user interview"},
        {"key": "C", "text": "A database backup"},
        {"key": "D", "text": "A deployment script"},
    ],
    "correctKey": "A",
    "explanation": "Unit tests check one unit in isolation.",
    "reviewLabel": "Unit testing",
}


class TestAdaptiveQuiz:

    def test_difficulty_adapts_to_mastery(self):
        assert llm_service.difficulty_for_mastery(30) == "foundational"
        assert llm_service.difficulty_for_mastery(60) == "intermediate"
        assert llm_service.difficulty_for_mastery(90) == "advanced"

    def test_invalid_questions_are_rejected(self):
        assert llm_service._valid_question(VALID_QUESTION)
        assert not llm_service._valid_question({**VALID_QUESTION, "correctKey": "E"})
        assert not llm_service._valid_question({**VALID_QUESTION, "options": VALID_QUESTION["options"][:3]})

    def test_quiz_is_grounded_in_outcome_and_feedback(self, client, sample_data, monkeypatch):
        seen = {}

        def fake_generate(context, num_questions=5):
            seen.update(context)
            return {"difficulty": "advanced", "questions": [{"id": "q1", **VALID_QUESTION}]}

        monkeypatch.setattr(llm_service, "generate_adaptive_quiz", fake_generate)
        headers = get_auth_headers(client, "S001")
        client.post("/api/students/S001/mastery/recalculate", headers=headers)

        response = client.get("/api/students/S001/quiz?lo_code=lo1", headers=headers)

        assert response.status_code == 200
        data = response.get_json()["data"]
        assert data["lo_code"] == "LO1"
        assert data["questions"][0]["correctKey"] == "A"
        assert seen["lo_description"] == "Software engineering"
        assert seen["feedback"] == ["Excellent design"]
        assert seen["mastery"] == 90

    def test_quiz_returns_503_when_ai_fails(self, client, sample_data, monkeypatch):
        def broken(context, num_questions=5):
            raise RuntimeError("no API key")

        monkeypatch.setattr(llm_service, "generate_adaptive_quiz", broken)
        headers = get_auth_headers(client, "S001")

        response = client.get("/api/students/S001/quiz?lo_code=LO1", headers=headers)

        assert response.status_code == 503

    @pytest.mark.parametrize("query, status", [("", 400), ("?lo_code=LO9", 404)])
    def test_quiz_validates_lo_code(self, client, sample_data, query, status):
        headers = get_auth_headers(client, "S001")

        response = client.get(f"/api/students/S001/quiz{query}", headers=headers)

        assert response.status_code == status
