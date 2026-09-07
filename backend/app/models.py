"""
Database models for the Learning Journey Assistant.

Six tables model the flow from raw Moodle data → mastery scores:
  1. Student           - Fake students enrolled in subjects
  2. Subject           - University subjects (e.g. CSE3CAP)
  3. LearningOutcome   - Skills/knowledge each subject teaches
  4. Assessment        - Assignments/exams within a subject
  5. RubricFeedback    - Tutor comments on an assessment, mapped to an LO
  6. MasteryScore      - Computed 0-100 score per student per LO
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

# Single database instance shared across the app
db = SQLAlchemy()


# ---------------------------------------------------------------------------
# 1. STUDENT
# ---------------------------------------------------------------------------
class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.String(20), primary_key=True)      # e.g. "S001"
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    enrolled_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships (back-populated)
    feedback = db.relationship("RubricFeedback", back_populates="student", cascade="all, delete-orphan")
    mastery_scores = db.relationship("MasteryScore", back_populates="student", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "enrolled_at": self.enrolled_at.isoformat() if self.enrolled_at else None,
        }

    def __repr__(self):
        return f"<Student {self.id} {self.name}>"


# ---------------------------------------------------------------------------
# 2. SUBJECT
# ---------------------------------------------------------------------------
class Subject(db.Model):
    __tablename__ = "subjects"

    code = db.Column(db.String(20), primary_key=True)    # e.g. "CSE3CAP"
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)

    learning_outcomes = db.relationship("LearningOutcome", back_populates="subject", cascade="all, delete-orphan")
    assessments = db.relationship("Assessment", back_populates="subject", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "code": self.code,
            "name": self.name,
            "description": self.description,
        }

    def __repr__(self):
        return f"<Subject {self.code}>"


# ---------------------------------------------------------------------------
# 3. LEARNING OUTCOME
# ---------------------------------------------------------------------------
class LearningOutcome(db.Model):
    __tablename__ = "learning_outcomes"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    subject_code = db.Column(db.String(20), db.ForeignKey("subjects.code"), nullable=False)
    lo_code = db.Column(db.String(20), nullable=False)   # e.g. "LO1"
    description = db.Column(db.Text, nullable=False)

    subject = db.relationship("Subject", back_populates="learning_outcomes")
    feedback = db.relationship("RubricFeedback", back_populates="learning_outcome")
    mastery_scores = db.relationship("MasteryScore", back_populates="learning_outcome")

    def to_dict(self):
        return {
            "id": self.id,
            "subject_code": self.subject_code,
            "lo_code": self.lo_code,
            "description": self.description,
        }

    def __repr__(self):
        return f"<LO {self.subject_code}.{self.lo_code}>"


# ---------------------------------------------------------------------------
# 4. ASSESSMENT
# ---------------------------------------------------------------------------
class Assessment(db.Model):
    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    subject_code = db.Column(db.String(20), db.ForeignKey("subjects.code"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    max_marks = db.Column(db.Integer, default=100)
    due_date = db.Column(db.DateTime)

    subject = db.relationship("Subject", back_populates="assessments")
    feedback = db.relationship("RubricFeedback", back_populates="assessment", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "subject_code": self.subject_code,
            "title": self.title,
            "max_marks": self.max_marks,
            "due_date": self.due_date.isoformat() if self.due_date else None,
        }

    def __repr__(self):
        return f"<Assessment {self.id} {self.title}>"


# ---------------------------------------------------------------------------
# 5. RUBRIC FEEDBACK
# ---------------------------------------------------------------------------
class RubricFeedback(db.Model):
    __tablename__ = "rubric_feedback"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id"), nullable=False)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), nullable=False)
    lo_id = db.Column(db.Integer, db.ForeignKey("learning_outcomes.id"), nullable=False)
    comment = db.Column(db.Text, nullable=False)
    score = db.Column(db.Float)      # rubric-level 0-100
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    assessment = db.relationship("Assessment", back_populates="feedback")
    student = db.relationship("Student", back_populates="feedback")
    learning_outcome = db.relationship("LearningOutcome", back_populates="feedback")

    def to_dict(self):
        return {
            "id": self.id,
            "assessment_id": self.assessment_id,
            "student_id": self.student_id,
            "lo_id": self.lo_id,
            "lo_code": self.learning_outcome.lo_code if self.learning_outcome else None,
            "comment": self.comment,
            "score": self.score,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<Feedback #{self.id} {self.student_id} LO={self.lo_id}>"


# ---------------------------------------------------------------------------
# 6. MASTERY SCORE (computed by the AI layer, stored here)
# ---------------------------------------------------------------------------
class MasteryScore(db.Model):
    __tablename__ = "mastery_scores"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), db.ForeignKey("students.id"), nullable=False)
    lo_id = db.Column(db.Integer, db.ForeignKey("learning_outcomes.id"), nullable=False)
    score = db.Column(db.Float, nullable=False)      # 0-100
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    student = db.relationship("Student", back_populates="mastery_scores")
    learning_outcome = db.relationship("LearningOutcome", back_populates="mastery_scores")

    # A student has exactly one score per learning outcome
    __table_args__ = (
        db.UniqueConstraint("student_id", "lo_id", name="uq_student_lo"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "lo_id": self.lo_id,
            "lo_code": self.learning_outcome.lo_code if self.learning_outcome else None,
            "score": self.score,
            "last_updated": self.last_updated.isoformat() if self.last_updated else None,
        }

    def __repr__(self):
        return f"<Mastery {self.student_id} LO={self.lo_id} = {self.score}>"