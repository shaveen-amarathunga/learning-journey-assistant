"""
Mock Moodle Data Generator
==========================
Produces JSON files that mimic the shape of Moodle's REST API responses.
These files live in /data and are consumed by:
  - scripts/seed_db.py (Step 5)     — loads them into our database
  - app/moodle_client.py (Step 8)   — pretends to be a Moodle API client

Design principles:
  - Realistic subject (CSE3CAP = the actual capstone code)
  - Real-sounding learning outcomes (software engineering skills)
  - Varied student profiles (strong / weak / mixed) — data tells a story
  - Rubric comments written like a real tutor would write them
"""
import json
import random
from datetime import datetime, timedelta
from pathlib import Path

# Reproducible randomness — same output every run
random.seed(42)

# Where the JSON files will be written
DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


# ---------------------------------------------------------------------------
# 1. SUBJECT
# ---------------------------------------------------------------------------
SUBJECT = {
    "code": "CSE3CAP",
    "name": "Computer Science Capstone Project",
    "description": (
        "A team-based capstone project where students apply software "
        "engineering, project management, and technical communication "
        "skills to deliver a working software system for a real-world "
        "problem. Emphasises agile methodology, teamwork, and "
        "professional practice."
    ),
}


# ---------------------------------------------------------------------------
# 2. LEARNING OUTCOMES
# ---------------------------------------------------------------------------
LEARNING_OUTCOMES = [
    {
        "lo_code": "LO1",
        "description": "Apply software engineering principles to design and implement a working system.",
    },
    {
        "lo_code": "LO2",
        "description": "Collaborate effectively in an agile team using version control and sprint-based delivery.",
    },
    {
        "lo_code": "LO3",
        "description": "Design and query relational databases to support application requirements.",
    },
    {
        "lo_code": "LO4",
        "description": "Develop and consume RESTful APIs following industry best practices.",
    },
    {
        "lo_code": "LO5",
        "description": "Communicate technical decisions clearly through written documentation and oral presentation.",
    },
]


# ---------------------------------------------------------------------------
# 3. STUDENTS — varied profiles so the demo tells a story
# ---------------------------------------------------------------------------
# profile: "strong" | "weak" | "mixed"
STUDENTS = [
    {"id": "S001", "name": "Aisha Khan",       "email": "aisha.khan@students.latrobe.edu.au",     "profile": "strong"},
    {"id": "S002", "name": "Ben Chen",         "email": "ben.chen@students.latrobe.edu.au",       "profile": "weak"},
    {"id": "S003", "name": "Chloe Ferreira",   "email": "chloe.ferreira@students.latrobe.edu.au", "profile": "mixed"},
    {"id": "S004", "name": "Dinesh Patel",     "email": "dinesh.patel@students.latrobe.edu.au",   "profile": "mixed"},
    {"id": "S005", "name": "Emma Wilson",      "email": "emma.wilson@students.latrobe.edu.au",    "profile": "mixed"},
]


# ---------------------------------------------------------------------------
# 4. ASSESSMENTS
# ---------------------------------------------------------------------------
today = datetime.utcnow()
ASSESSMENTS = [
    {
        "id": 1,
        "title": "Sprint 1 Deliverable — Project Setup & Skeleton",
        "max_marks": 100,
        "due_date": (today - timedelta(days=21)).isoformat(),
    },
    {
        "id": 2,
        "title": "Sprint 2 Deliverable — Backend & Database Implementation",
        "max_marks": 100,
        "due_date": (today - timedelta(days=7)).isoformat(),
    },
    {
        "id": 3,
        "title": "Technical Report & Team Presentation",
        "max_marks": 100,
        "due_date": (today + timedelta(days=14)).isoformat(),
    },
]


# ---------------------------------------------------------------------------
# 5. RUBRIC FEEDBACK — the important one
# ---------------------------------------------------------------------------
# A pool of realistic tutor comments for each LO, at 3 quality bands.
# When generating feedback, we pick a comment matching the student's profile.

COMMENT_BANK = {
    "LO1": {
        "high": [
            "Excellent architectural decisions. The separation between the API and data layer is clean and follows SOLID principles.",
            "Strong implementation — code is readable, well-commented, and demonstrates thoughtful design.",
            "Impressive use of design patterns. The dependency injection approach makes the system easy to test.",
        ],
        "mid": [
            "Reasonable design overall, but some functions are doing too much. Consider breaking them into smaller units.",
            "Implementation works but the code duplication in the service layer should be refactored.",
            "Good effort. Naming conventions are inconsistent — please standardise.",
        ],
        "low": [
            "The system runs but the design lacks structure. Business logic is mixed with data access code — separate these concerns.",
            "Several core features are incomplete. The mastery calculation module has placeholder logic.",
            "Weak handling of edge cases. What happens when a student has no submitted assessments?",
        ],
    },
    "LO2": {
        "high": [
            "Excellent use of Git — clean commit messages, feature branches, and consistent PR reviews across the team.",
            "Strong evidence of agile practice. Sprint retrospectives are well-documented and lead to real process improvements.",
            "Team collaboration is exemplary. Everyone contributes to code review and pair programming sessions.",
        ],
        "mid": [
            "Git usage is functional but commit messages are often unclear. 'fixed stuff' is not helpful.",
            "Sprint planning is happening but not consistently documented. Please attach minutes to each sprint.",
            "Team dynamics are okay but some members contribute significantly more than others.",
        ],
        "low": [
            "Git history shows most commits from one team member. Redistribute the workload.",
            "No evidence of sprint retrospectives. This is a core agile practice — please implement.",
            "Merge conflicts are being handled poorly. Several times, working code has been overwritten.",
        ],
    },
    "LO3": {
        "high": [
            "Excellent normalised schema. Foreign key constraints are correctly applied and indexes are well-chosen.",
            "Strong query design. The use of joins over subqueries improves performance noticeably.",
            "Well-documented ER diagram matches the implementation exactly. Impressive attention to detail.",
        ],
        "mid": [
            "Schema is reasonable but the mastery_scores table would benefit from a composite index on (student_id, lo_id).",
            "Some queries would be more efficient with proper indexing. Please review the slow-query log.",
            "The ER diagram is out of date compared to the actual schema — please synchronise.",
        ],
        "low": [
            "Schema shows denormalisation issues. Student names should not be duplicated across tables.",
            "Missing foreign key constraints allow orphan rubric feedback records to exist. This will cause data integrity problems.",
            "Weak handling of multi-table joins — several queries produce Cartesian products.",
        ],
    },
    "LO4": {
        "high": [
            "Excellent RESTful design. Resource naming, HTTP verbs, and status codes all follow best practices.",
            "Strong API documentation with clear request/response examples. Postman collection is comprehensive.",
            "Impressive error handling — every endpoint returns meaningful error messages with correct status codes.",
        ],
        "mid": [
            "API works but some endpoints return 200 OK even on failure. Use appropriate 4xx/5xx codes.",
            "Documentation exists but is incomplete. Several endpoints are missing example responses.",
            "Response format is inconsistent — some endpoints return arrays, others wrap them in objects.",
        ],
        "low": [
            "Multiple endpoints do not follow REST conventions. /getStudent should be GET /students/<id>.",
            "No API documentation provided. Impossible to consume without reading the source code.",
            "Weak validation — the /mastery endpoint accepts negative scores without rejecting them.",
        ],
    },
    "LO5": {
        "high": [
            "Excellent report structure with clear technical justification for every design decision.",
            "Strong oral presentation — team members explain trade-offs confidently and answer questions well.",
            "Impressive documentation — the README allows a new developer to set up the project in under 10 minutes.",
        ],
        "mid": [
            "Report is well-written but some sections feel rushed. The security considerations chapter needs more depth.",
            "Presentation is clear but Q&A responses lack technical detail.",
            "README covers the basics but is missing environment variable documentation.",
        ],
        "low": [
            "Report contains several grammatical errors and unclear technical explanations.",
            "Presentation was disorganised — team members contradicted each other on key decisions.",
            "Documentation is minimal. New team members would struggle to onboard.",
        ],
    },
}


def score_band_for_profile(profile: str) -> str:
    """Return 'high', 'mid', or 'low' based on student profile.

    Weighted so:
      - strong students mostly get high scores, occasionally mid
      - weak students mostly get low scores, occasionally mid
      - mixed students get a spread
    """
    if profile == "strong":
        return random.choices(["high", "mid", "low"], weights=[70, 25, 5])[0]
    if profile == "weak":
        return random.choices(["high", "mid", "low"], weights=[5, 25, 70])[0]
    # mixed
    return random.choices(["high", "mid", "low"], weights=[30, 40, 30])[0]


def score_from_band(band: str) -> float:
    """Return a numeric 0-100 rubric score for a comment band."""
    if band == "high":
        return round(random.uniform(80, 98), 1)
    if band == "mid":
        return round(random.uniform(55, 79), 1)
    return round(random.uniform(20, 54), 1)


def generate_rubric_feedback():
    """Produce a list of feedback entries. Every student is graded on every LO
    for the first two assessments. That gives us 5 students * 5 LOs * 2 = 50
    feedback records — plenty of data to compute meaningful mastery scores."""
    feedback = []
    feedback_id = 1

    for student in STUDENTS:
        for assessment in ASSESSMENTS[:2]:   # skip the future assessment
            for lo in LEARNING_OUTCOMES:
                band = score_band_for_profile(student["profile"])
                comment = random.choice(COMMENT_BANK[lo["lo_code"]][band])
                score = score_from_band(band)

                feedback.append({
                    "id": feedback_id,
                    "assessment_id": assessment["id"],
                    "student_id": student["id"],
                    "lo_code": lo["lo_code"],
                    "comment": comment,
                    "score": score,
                    "created_at": assessment["due_date"],
                })
                feedback_id += 1

    return feedback


# ---------------------------------------------------------------------------
# WRITE ALL JSON FILES
# ---------------------------------------------------------------------------
def write_json(filename: str, data) -> None:
    path = DATA_DIR / filename
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  ✓ Wrote {path.name}  ({len(data) if isinstance(data, list) else 1} record(s))")


def main():
    print(f"\nGenerating mock Moodle data → {DATA_DIR}\n")

    write_json("subjects.json", [SUBJECT])
    write_json("learning_outcomes.json", LEARNING_OUTCOMES)
    write_json("students.json", [
        {k: v for k, v in s.items() if k != "profile"}   # profile is internal only
        for s in STUDENTS
    ])
    write_json("assessments.json", ASSESSMENTS)
    write_json("rubric_feedback.json", generate_rubric_feedback())

    print("\n✅ Mock Moodle data generated successfully!\n")


if __name__ == "__main__":
    main()