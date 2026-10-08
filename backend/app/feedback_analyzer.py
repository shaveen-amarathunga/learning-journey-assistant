import re

# sentence-transformers (and PyTorch) is optional. It needs far more memory
# than small hosting plans provide, so when it isn't installed we fall back
# to the keyword rules only.
try:
    from sentence_transformers import SentenceTransformer, util
except ImportError:
    SentenceTransformer = None
    util = None

from app.models import RubricFeedback, LearningOutcome


_semantic_model = None


def get_semantic_model():
    """
    Load the sentence-transformer model once and reuse it.
    CPU is used explicitly for compatibility across development machines.
    """
    global _semantic_model

    if SentenceTransformer is None:
        return None

    if _semantic_model is None:
        _semantic_model = SentenceTransformer(
            "all-MiniLM-L6-v2",
            device="cpu"
        )

    return _semantic_model


def analyse_feedback(comment: str) -> dict:
    """
    Identify whether written feedback is positive, constructive,
    or indicates an area requiring improvement.
    """
    text = comment.strip()
    text_lower = text.lower()

    positive_words = [
        "excellent",
        "strong",
        "impressive",
        "good",
        "well",
        "effective",
        "clear",
    ]

    improvement_words = [
        "weak",
        "poor",
        "unclear",
        "minimal",
        "struggle",
        "struggles",
        "difficulty",
        "missing",
        "should",
        "needs",
        "however",
        "but",
        "improve",
        "improvement",
    ]

    positive_matches = [
        word
        for word in positive_words
        if re.search(
            rf"\b{re.escape(word)}\b",
            text_lower
        )
    ]

    improvement_matches = [
        word
        for word in improvement_words
        if re.search(
            rf"\b{re.escape(word)}\b",
            text_lower
        )
    ]

    if positive_matches and improvement_matches:
        feedback_type = "constructive"
    elif improvement_matches:
        feedback_type = "needs improvement"
    elif positive_matches:
        feedback_type = "positive"
    else:
        feedback_type = "neutral"

    return {
        "comment": text,
        "feedback_type": feedback_type,
        "positive_indicators": positive_matches,
        "improvement_indicators": improvement_matches,
    }


def calculate_feedback_relevance(
    comment: str,
    lo_description: str
) -> float:
    """
    Measure semantic similarity between feedback and the actual
    learning-outcome description stored in the database.

    This is subject-independent: adding another subject does not
    require adding Python rules.
    """
    model = get_semantic_model()

    if model is None:
        return 0.0

    embeddings = model.encode(
        [comment, lo_description],
        convert_to_tensor=True
    )

    similarity = util.cos_sim(
        embeddings[0],
        embeddings[1]
    )[0][0]

    return float(similarity.item())


def analyse_feedback_record(
    feedback: RubricFeedback,
    learning_outcome: LearningOutcome
) -> dict:
    """
    Analyse one database feedback record using its real learning
    outcome as context.
    """
    feedback_analysis = analyse_feedback(
        feedback.comment
    )

    relevance = calculate_feedback_relevance(
        feedback.comment,
        learning_outcome.description
    )

    needs_attention = (
        feedback_analysis["feedback_type"]
        in ["needs improvement", "constructive"]
    )

    return {
        "subject_code": learning_outcome.subject_code,
        "lo_code": learning_outcome.lo_code,
        "lo_description": learning_outcome.description,
        "comment": feedback.comment,
        "score": feedback.score,
        "feedback_type":
            feedback_analysis["feedback_type"],
        "positive_indicators":
            feedback_analysis["positive_indicators"],
        "improvement_indicators":
            feedback_analysis["improvement_indicators"],
        "semantic_relevance": round(relevance, 4),
        "needs_attention": needs_attention,
    }


def get_student_knowledge_gaps(
    student_id: str,
    subject_code: str
) -> dict:
    """
    Analyse a student's rubric feedback for one selected subject.

    Feedback and learning outcomes are loaded directly from the
    database, making the analysis independent of hardcoded subjects
    and duplicated JSON feedback files.
    """
    if not subject_code:
        raise ValueError("subject_code is required")

    subject_code = subject_code.upper()

    feedback_records = (
        RubricFeedback.query
        .join(
            LearningOutcome,
            RubricFeedback.lo_id == LearningOutcome.id
        )
        .filter(
            RubricFeedback.student_id == student_id,
            LearningOutcome.subject_code == subject_code,
        )
        .order_by(RubricFeedback.created_at.asc())
        .all()
    )

    analysed_records = []

    for feedback in feedback_records:
        learning_outcome = feedback.learning_outcome

        if learning_outcome is None:
            continue

        analysed_records.append(
            analyse_feedback_record(
                feedback,
                learning_outcome
            )
        )

    # Keep only feedback that indicates improvement is required.
    gap_records = [
        record
        for record in analysed_records
        if record["needs_attention"]
    ]

    # Group the student's weaknesses by the real database LO.
    grouped = {}

    for record in gap_records:
        key = record["lo_code"]

        if key not in grouped:
            grouped[key] = {
                "subject_code": record["subject_code"],
                "lo_code": record["lo_code"],
                "lo_description": record["lo_description"],
                "feedback": [],
                "scores": [],
                "semantic_relevance": [],
            }

        grouped[key]["feedback"].append(
            record["comment"]
        )

        if record["score"] is not None:
            grouped[key]["scores"].append(
                float(record["score"])
            )

        grouped[key]["semantic_relevance"].append(
            record["semantic_relevance"]
        )

    knowledge_gaps = []

    for item in grouped.values():
        scores = item["scores"]

        average_score = (
            round(sum(scores) / len(scores), 2)
            if scores
            else None
        )

        relevance_scores = item[
            "semantic_relevance"
        ]

        average_relevance = (
            round(
                sum(relevance_scores)
                / len(relevance_scores),
                4
            )
            if relevance_scores
            else 0.0
        )

        # Keep the structure useful to both the recommendation
        # service and the quiz-generation service. The detailed
        # wording can be generated by the LLM from real context.
        knowledge_gaps.append({
            "subject_code": item["subject_code"],
            "lo_code": item["lo_code"],
            "lo_description": item["lo_description"],
            "knowledge_gap":
                f"Improvement needed in {item['lo_description']}",
            "recommendation":
                f"Review and practise {item['lo_description']}",
            "feedback": " ".join(item["feedback"]),
            "score": average_score,
            "semantic_relevance": average_relevance,
        })

    return {
        "student_id": student_id,
        "subject_code": subject_code,
        "feedback_records_analysed":
            len(analysed_records),
        "knowledge_gaps": knowledge_gaps,
    }
