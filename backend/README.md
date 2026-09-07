# Learning Journey Assistant

Backend API (Team: Smart Stack) that turns Moodle rubric feedback into per-student, per-learning-outcome **mastery scores**.

## What it does

1. Reads student, subject, learning outcome, assessment, and rubric feedback data from Moodle (currently a mock Moodle client backed by JSON fixtures, swappable for the real Moodle REST API later).
2. Stores that data in a local SQLite database via SQLAlchemy models.
3. Computes a 0–100 mastery score per learning outcome for each student, weighting the most recent assessment's feedback more heavily than older feedback.
4. Exposes everything through a JSON REST API for a frontend to consume.

## Tech stack

- Python 3.11, Flask 3, Flask-SQLAlchemy, Flask-CORS
- SQLite (file-based, `database.db`)
- pytest for testing
- Faker for generating mock data

## Project layout

```
app/
  __init__.py          Flask application factory
  config.py             Config (DB URI, mock data dir, etc.)
  models.py              6 SQLAlchemy models: Student, Subject, LearningOutcome,
                          Assessment, RubricFeedback, MasteryScore
  moodle_client.py       Abstract MoodleClient + MockMoodleClient (reads /data JSON)
                          + RealMoodleClient placeholder
  mastery_calculator.py  Weighted-average mastery scoring algorithm
  routes.py               All /api/* endpoints
data/                    Mock Moodle JSON fixtures (subjects, students, LOs,
                          assessments, rubric feedback)
scripts/
  mock_moodle_generator.py  Generates the mock data in /data using Faker
  seed_db.py                 Loads /data into the SQLite database
tests/
  conftest.py, test_models.py, test_moodle_client.py,
  test_mastery_calculator.py, test_api.py
run.py                  Dev server entry point
```

## Setup

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Generate mock data & seed the database

```bash
python scripts/mock_moodle_generator.py   # writes JSON fixtures to /data
python scripts/seed_db.py                 # loads fixtures into database.db
```

## Run the server

```bash
python run.py
```

Server runs at `http://127.0.0.1:5001`.

## Run tests

```bash
pytest
```

33 tests covering models, the mock Moodle client, the mastery calculator, and the API routes.

## API overview

All endpoints are under `/api`. Responses are JSON: `{"data": ...}` on success, `{"error": "..."}` on failure.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/info` | Row counts across all tables |
| GET | `/api/students` | List all students |
| GET | `/api/students/<id>` | Single student profile |
| GET | `/api/students/<id>/feedback` | A student's rubric feedback (optional `?lo_code=`) |
| GET | `/api/students/<id>/mastery` | A student's current mastery scores |
| POST | `/api/students/<id>/mastery` | Upsert mastery scores (used by the AI layer) |
| POST | `/api/students/<id>/mastery/recalculate` | Recompute one student's mastery from feedback |
| POST | `/api/mastery/recalculate-all` | Recompute mastery for every student |
| GET | `/api/subjects` | List all subjects |
| GET | `/api/subjects/<code>` | Subject details incl. LOs and assessments |
| GET | `/api/moodle/subjects` | Subjects read directly from the Moodle client |
| GET | `/api/moodle/students/<id>/feedback` | A student's feedback read directly from Moodle |

## Mastery scoring algorithm (v1)

For each learning outcome, mastery is the weighted average of all rubric scores for that LO: the most recent piece of feedback gets weight `1.0`, everything older gets weight `0.7`. This is a deterministic, transparent baseline intended to be replaced/enhanced by an AI-driven scoring layer later.

## Notes

- The Moodle integration uses the **Adapter pattern**: `MockMoodleClient` and the not-yet-implemented `RealMoodleClient` both satisfy the same `MoodleClient` interface, so swapping in the real Moodle API later won't require changing any downstream code.
- `SECRET_KEY` can be set via environment variable; defaults to a dev value.
