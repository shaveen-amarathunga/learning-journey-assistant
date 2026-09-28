"""Tests for the API endpoints."""
import json


def get_auth_headers(client, student_id="S001", password="password123"):
    response = client.post(
        "/api/auth/login",
        json={
            "student_id": student_id,
            "password": password,
        },
    )

    token = response.get_json()["access_token"]

    return {
        "Authorization": f"Bearer {token}"
    }


class TestHealthAndInfo:

    def test_health_check_returns_ok(self, client, sample_data):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "ok"

    def test_info_returns_counts(self, client, sample_data):
        response = client.get("/api/info")
        data = response.get_json()
        assert data["data"]["students"] == 2
        assert data["data"]["subjects"] == 1
        assert data["data"]["learning_outcomes"] == 2

    def test_root_endpoint_returns_metadata(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.get_json()
        assert "name" in data
        assert data["team"] == "Smart Stack"


class TestStudentEndpoints:

    def test_list_students_returns_all(self, client, sample_data):
        response = client.get("/api/students")
        data = response.get_json()
        assert data["count"] == 2
        student_ids = [s["id"] for s in data["data"]]
        assert "S001" in student_ids
        assert "S002" in student_ids

    def test_get_student_by_id_returns_profile(self, client, sample_data):
        headers = get_auth_headers(client)

        response = client.get(
            "/api/students/S001",
            headers=headers,
        )

        data = response.get_json()
        assert response.status_code == 200
        assert data["data"]["name"] == "Aisha Khan"
        assert data["data"]["feedback_count"] == 2

    def test_get_nonexistent_student_returns_404(self, client, sample_data):
        headers = get_auth_headers(client)

        response = client.get(
            "/api/students/S999",
            headers=headers,
        )

        assert response.status_code == 404
        assert "error" in response.get_json()

    def test_get_student_feedback_returns_records(self, client, sample_data):
        headers = get_auth_headers(client)

        response = client.get(
            "/api/students/S001/feedback",
            headers=headers,
        )

        data = response.get_json()
        assert response.status_code == 200
        assert data["count"] == 2
        assert data["student_id"] == "S001"

    def test_feedback_can_be_filtered_by_lo_code(self, client, sample_data):
        headers = get_auth_headers(client)

        response = client.get(
            "/api/students/S001/feedback?lo_code=LO1",
            headers=headers,
        )

        data = response.get_json()
        assert response.status_code == 200
        assert data["count"] == 1
        assert data["data"][0]["lo_code"] == "LO1"


class TestMasteryWriteEndpoint:

    def test_post_mastery_creates_scores(self, client, sample_data):
        headers = get_auth_headers(client)

        payload = {"scores": [{"lo_code": "LO1", "score": 88.5}]}

        response = client.post(
            "/api/students/S001/mastery",
            data=json.dumps(payload),
            content_type="application/json",
            headers=headers,
        )

        assert response.status_code == 201
        data = response.get_json()
        assert "LO1" in data["data"]["created"]

    def test_post_mastery_updates_existing_score(self, client, sample_data):
        headers = get_auth_headers(client)

        payload = {"scores": [{"lo_code": "LO1", "score": 88.5}]}

        client.post(
            "/api/students/S001/mastery",
            data=json.dumps(payload),
            content_type="application/json",
            headers=headers,
        )

        payload2 = {"scores": [{"lo_code": "LO1", "score": 92.0}]}

        response = client.post(
            "/api/students/S001/mastery",
            data=json.dumps(payload2),
            content_type="application/json",
            headers=headers,
        )

        data = response.get_json()
        assert response.status_code == 200
        assert "LO1" in data["data"]["updated"]
        assert "LO1" not in data["data"]["created"]

    def test_post_mastery_rejects_out_of_range_score(self, client, sample_data):
        headers = get_auth_headers(client)

        payload = {"scores": [{"lo_code": "LO1", "score": 150}]}

        response = client.post(
            "/api/students/S001/mastery",
            data=json.dumps(payload),
            content_type="application/json",
            headers=headers,
        )

        assert response.status_code == 400
        assert "between 0 and 100" in response.get_json()["error"]

    def test_post_mastery_rejects_missing_scores_field(self, client, sample_data):
        headers = get_auth_headers(client)

        response = client.post(
            "/api/students/S001/mastery",
            data=json.dumps({}),
            content_type="application/json",
            headers=headers,
        )

        assert response.status_code == 400

    def test_post_mastery_for_unknown_student_returns_404(self, client, sample_data):
        headers = get_auth_headers(client)

        payload = {"scores": [{"lo_code": "LO1", "score": 80}]}

        response = client.post(
            "/api/students/S999/mastery",
            data=json.dumps(payload),
            content_type="application/json",
            headers=headers,
        )

        assert response.status_code == 403


class TestSubjectEndpoints:

    def test_list_subjects(self, client, sample_data):
        response = client.get("/api/subjects")
        data = response.get_json()
        assert data["count"] == 1
        assert data["data"][0]["code"] == "CSE3CAP"

    def test_get_subject_includes_nested_lo_data(self, client, sample_data):
        response = client.get("/api/subjects/CSE3CAP")
        data = response.get_json()
        assert len(data["data"]["learning_outcomes"]) == 2


class TestAuthentication:

    def test_login_success(self, client, sample_data):
        response = client.post(
            "/api/auth/login",
            json={
                "student_id": "S001",
                "password": "password123",
            },
        )

        assert response.status_code == 200

        data = response.get_json()

        assert "access_token" in data
        assert data["student_id"] == "S001"
        assert data["name"] == "Aisha Khan"

    def test_login_wrong_password(self, client, sample_data):
        response = client.post(
            "/api/auth/login",
            json={
                "student_id": "S001",
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 401
        assert response.get_json()["error"] == "Invalid credentials"

    def test_login_missing_credentials(self, client, sample_data):
        response = client.post(
            "/api/auth/login",
            json={
                "student_id": "S001",
            },
        )

        assert response.status_code == 400

    def test_protected_route_requires_token(self, client, sample_data):
        response = client.get("/api/students/S001")

        assert response.status_code == 401

    def test_student_can_access_own_data(self, client, sample_data):
        headers = get_auth_headers(client, "S001")

        response = client.get(
            "/api/students/S001",
            headers=headers,
        )

        assert response.status_code == 200
        assert response.get_json()["data"]["id"] == "S001"

    def test_student_cannot_access_other_student_data(self, client, sample_data):
        headers = get_auth_headers(client, "S001")

        response = client.get(
            "/api/students/S002",
            headers=headers,
        )

        assert response.status_code == 403

    def test_protected_feedback_requires_ownership(self, client, sample_data):
        headers = get_auth_headers(client, "S001")

        response = client.get(
            "/api/students/S002/feedback",
            headers=headers,
        )

        assert response.status_code == 403
        