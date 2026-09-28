import json
import re

from sentence_transformers import SentenceTransformer, util


# Lightweight semantic model used to understand feedback
# even when the wording does not exactly match our keywords.
_semantic_model = None


def get_semantic_model():
    global _semantic_model

    if _semantic_model is None:
        _semantic_model = SentenceTransformer("all-MiniLM-L6-v2")

    return _semantic_model


# Semantic descriptions of the knowledge gaps.
# These allow the system to understand feedback even when
# the wording does not exactly match our keyword rules.
SEMANTIC_GAPS = {
    "LO1": [
        (
            "The software does not handle invalid inputs, errors, unusual situations, or edge cases correctly.",
            "Software robustness and edge-case handling",
            "Review input validation, error handling, and testing for edge cases."
        ),
        (
            "The code contains duplication, poor structure, or needs refactoring and better modular design.",
            "Code quality and software design",
            "Review refactoring, modular design, and the DRY principle."
        ),
        (
            "The software design does not follow appropriate design principles or patterns.",
            "Software design principles",
            "Review SOLID principles and common software design patterns."
        )
    ],

    "LO2": [
        (
            "Git commits are unclear, poorly described, or do not communicate changes effectively.",
            "Git commit communication",
            "Practise writing clear, descriptive, and consistent Git commit messages."
        ),
        (
            "The student has difficulty resolving conflicts when merging code with other team members.",
            "Git merge conflict management",
            "Review how to resolve Git merge conflicts safely before merging code."
        ),
        (
            "The team has problems with collaboration, workload distribution, contribution, or communication.",
            "Agile team collaboration",
            "Review task allocation, team communication, and collaborative agile practices."
        ),
        (
            "The team needs improvement in sprint planning, retrospectives, or agile processes.",
            "Agile sprint practices",
            "Review sprint planning, retrospectives, and continuous improvement."
        )
    ],

    "LO3": [
        (
            "The database does not correctly enforce relationships, referential integrity, or foreign key constraints.",
            "Database integrity and foreign key constraints",
            "Review foreign key constraints and referential integrity in relational databases."
        ),
        (
            "Database queries are inefficient, slow, or could be improved for better performance.",
            "Database query optimisation",
            "Review database indexing and efficient SQL query design."
        ),
        (
            "The relational database schema, table relationships, or normalisation could be designed better.",
            "Relational database design",
            "Review relational schema design, relationships, and normalisation."
        )
    ],

    "LO4": [
        (
            "The API does not correctly validate input or handle invalid requests and errors.",
            "API input validation",
            "Review REST API input validation and appropriate error responses."
        ),
        (
            "The REST API uses inappropriate HTTP methods, status codes, endpoints, or resource design.",
            "RESTful API design",
            "Review HTTP methods, status codes, and RESTful resource design."
        )
    ],

    "LO5": [
        (
            "The project documentation is incomplete, unclear, or does not explain how to understand and run the system.",
            "Technical documentation",
            "Improve README and technical documentation so another developer can understand and run the system."
        ),
        (
            "The student has difficulty explaining technical decisions clearly in a presentation or discussion.",
            "Technical communication",
            "Practise clearly explaining technical decisions and their justification."
        )
    ]
}


def identify_semantic_knowledge_gap(comment: str, lo_code: str) -> dict:
    """
    Use sentence embeddings to identify a knowledge gap even when
    the feedback does not contain an exact keyword match.
    """

    candidates = SEMANTIC_GAPS.get(lo_code, [])

    if not candidates:
        return {
            "knowledge_gap": "No specific knowledge gap identified",
            "recommendation": "Review the feedback and relevant learning outcome."
        }

    model = get_semantic_model()

    descriptions = [
        candidate[0]
        for candidate in candidates
    ]

    comment_embedding = model.encode(
        comment,
        convert_to_tensor=True
    )

    description_embeddings = model.encode(
        descriptions,
        convert_to_tensor=True
    )

    similarities = util.cos_sim(
        comment_embedding,
        description_embeddings
    )[0]

    best_index = int(similarities.argmax().item())
    best_score = float(similarities[best_index].item())

    # Prevent weak semantic matches from being treated as real gaps.
    if best_score < 0.35:
        return {
            "knowledge_gap": "No specific knowledge gap identified",
            "recommendation": "Review the feedback and relevant learning outcome."
        }

    _, gap, recommendation = candidates[best_index]

    return {
        "knowledge_gap": gap,
        "recommendation": recommendation
    }


def analyse_feedback(comment: str) -> dict:
    """
    Analyse written assessment feedback and identify
    strengths, weaknesses and the overall feedback type.
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
        "clear"
    ]

    improvement_words = [
        "weak",
        "poor",
        "unclear",
        "minimal",
        "struggle",
        "missing",
        "should",
        "needs",
        "however",
        "but"
    ]

    positive_matches = [
        word for word in positive_words
        if re.search(
            rf"\b{re.escape(word)}\b",
            text_lower
        )
    ]

    improvement_matches = [
        word for word in improvement_words
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
        "improvement_indicators": improvement_matches
    }


def identify_knowledge_gap(comment: str, lo_code: str) -> dict:
    """
    Identify a likely knowledge or skill gap from written
    feedback using the learning outcome as context.

    Exact keyword rules are checked first. If no keyword
    matches, semantic similarity is used as a fallback.
    """

    text = comment.lower()

    gap_patterns = {
        "LO1": [
            (
                ["edge case", "edge cases", "validation"],
                "Software robustness and edge-case handling",
                "Review input validation, error handling, and testing for edge cases."
            ),
            (
                ["duplication", "refactor", "too much"],
                "Code quality and software design",
                "Review refactoring, modular design, and the DRY principle."
            ),
            (
                ["design pattern", "solid"],
                "Software design principles",
                "Review SOLID principles and common software design patterns."
            )
        ],

        "LO2": [
            (
                ["commit message", "commit messages"],
                "Git commit communication",
                "Practise writing clear, descriptive, and consistent Git commit messages."
            ),
            (
                ["merge conflict", "merge conflicts"],
                "Git merge conflict management",
                "Review how to resolve Git merge conflicts safely before merging code."
            ),
            (
                ["workload", "team dynamics", "contribute"],
                "Agile team collaboration",
                "Review task allocation, team communication, and collaborative agile practices."
            ),
            (
                ["sprint planning", "retrospective"],
                "Agile sprint practices",
                "Review sprint planning, retrospectives, and continuous improvement."
            )
        ],

        "LO3": [
            (
                ["foreign key", "foreign keys", "orphan", "data integrity"],
                "Database integrity and foreign key constraints",
                "Review foreign key constraints and referential integrity in relational databases."
            ),
            (
                ["index", "indexes", "query"],
                "Database query optimisation",
                "Review database indexing and efficient SQL query design."
            ),
            (
                ["schema", "relationship", "normalisation", "normalization"],
                "Relational database design",
                "Review relational schema design, relationships, and normalisation."
            )
        ],

        "LO4": [
            (
                ["validation", "negative", "endpoint"],
                "API input validation",
                "Review REST API input validation and appropriate error responses."
            ),
            (
                ["status code", "http verb", "resource naming"],
                "RESTful API design",
                "Review HTTP methods, status codes, and RESTful resource design."
            )
        ],

        "LO5": [
            (
                ["documentation", "readme"],
                "Technical documentation",
                "Improve README and technical documentation so another developer can understand and run the system."
            ),
            (
                ["presentation", "communicate", "explain"],
                "Technical communication",
                "Practise clearly explaining technical decisions and their justification."
            )
        ]
    }

    # First try fast and deterministic keyword matching.
    for keywords, gap, recommendation in gap_patterns.get(lo_code, []):
        if any(keyword in text for keyword in keywords):
            return {
                "knowledge_gap": gap,
                "recommendation": recommendation
            }

    # If there was no exact keyword match, use semantic NLP.
    return identify_semantic_knowledge_gap(
        comment,
        lo_code
    )


def analyse_student_feedback(comment: str, lo_code: str) -> dict:
    """
    Run the complete feedback analysis pipeline.
    """

    feedback_analysis = analyse_feedback(comment)

    # Only identify a knowledge gap when the feedback
    # actually indicates an area requiring improvement.
    if feedback_analysis["feedback_type"] in [
        "needs improvement",
        "constructive"
    ]:
        gap_analysis = identify_knowledge_gap(
            comment,
            lo_code
        )

    else:
        gap_analysis = {
            "knowledge_gap": "No knowledge gap identified",
            "recommendation":
                "Continue demonstrating competency in this learning outcome."
        }

    return {
        "lo_code": lo_code,
        "comment": comment,
        "feedback_type":
            feedback_analysis["feedback_type"],
        "positive_indicators":
            feedback_analysis["positive_indicators"],
        "improvement_indicators":
            feedback_analysis["improvement_indicators"],
        "knowledge_gap":
            gap_analysis["knowledge_gap"],
        "recommendation":
            gap_analysis["recommendation"]
    }


def analyse_feedback_file(file_path: str) -> list:
    """
    Analyse every feedback record contained in a JSON file.
    """

    with open(file_path, "r", encoding="utf-8") as file:
        feedback_records = json.load(file)

    results = []

    for record in feedback_records:
        analysis = analyse_student_feedback(
            record["comment"],
            record["lo_code"]
        )

        # Keep the original information so the NLP result
        # can still be connected to the student and assessment.
        analysis["student_id"] = record["student_id"]
        analysis["assessment_id"] = record["assessment_id"]
        analysis["score"] = record["score"]

        results.append(analysis)

    return results


def get_student_knowledge_gaps(
    file_path: str,
    student_id: str
) -> dict:
    """
    Analyse all feedback for one student and return
    the knowledge gaps that were identified.
    """

    results = analyse_feedback_file(file_path)

    student_results = [
        result
        for result in results
        if result["student_id"] == student_id
    ]

    gaps = []

    for result in student_results:
        if result["knowledge_gap"] not in [
            "No knowledge gap identified",
            "No specific knowledge gap identified"
        ]:
            gaps.append({
                "lo_code": result["lo_code"],
                "knowledge_gap": result["knowledge_gap"],
                "recommendation": result["recommendation"],
                "feedback": result["comment"],
                "score": result["score"]
            })

    return {
        "student_id": student_id,
        "feedback_records_analysed": len(student_results),
        "knowledge_gaps": gaps
    }