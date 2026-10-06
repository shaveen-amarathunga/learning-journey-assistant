"""
Personalised Recommendation Engine
LJAB22-51

Uses a student's identified knowledge gaps and performance
to generate personalised learning recommendations.
"""

from typing import Dict, List


# Learning resources/actions for knowledge gaps identified by our NLP analyser
RECOMMENDATION_MAP = {
    "Git commit communication": [
        "Practise writing clear and descriptive Git commit messages.",
        "Use short commit titles that explain exactly what changed.",
        "Review your recent Git history and improve unclear commit messages.",
    ],

    "Database query optimisation": [
        "Review database indexing and how indexes improve query performance.",
        "Practise optimising SQL queries using appropriate indexes.",
        "Review query execution and identify unnecessary database operations.",
    ],

    "Database integrity": [
        "Review primary keys, foreign keys, and referential integrity.",
        "Practise designing database relationships with appropriate constraints.",
        "Check how foreign key constraints prevent orphan records.",
    ],

    "Technical documentation": [
        "Improve README documentation with setup and usage instructions.",
        "Practise explaining technical decisions clearly.",
        "Document important configuration and environment variables.",
    ],

    "Software design principles": [
        "Review SOLID software design principles.",
        "Practise separating responsibilities between application components.",
        "Review your code for functions or classes doing too many things.",
    ],

    "API design": [
        "Review RESTful API design principles and HTTP methods.",
        "Practise designing clear API endpoints and status codes.",
        "Review API validation and error handling.",
    ],
}


def get_recommendation_for_gap(
    knowledge_gap: str,
    score: float | None = None
) -> Dict:
    """
    Generate a personalised recommendation for one knowledge gap.
    """

    actions = RECOMMENDATION_MAP.get(
        knowledge_gap,
        [
            f"Review the concepts related to {knowledge_gap}.",
            "Practise the topic using a small practical exercise.",
            "Review feedback from previous assessments before attempting it again.",
        ],
    )

    # Personalise priority using the student's score
    if score is None:
        priority = "medium"
    elif score < 60:
        priority = "high"
    elif score < 75:
        priority = "medium"
    else:
        priority = "low"

    return {
        "knowledge_gap": knowledge_gap,
        "priority": priority,
        "score": score,
        "recommended_actions": actions,
    }


def generate_personalised_recommendations(
    knowledge_gaps: List[Dict]
) -> List[Dict]:
    """
    Convert knowledge gaps produced by the NLP feedback analyser
    into personalised recommendations.
    """

    recommendations = []

    for gap in knowledge_gaps:
        knowledge_gap = gap.get("knowledge_gap")

        if not knowledge_gap:
            continue

        if knowledge_gap == "No knowledge gap identified":
            continue

        recommendation = get_recommendation_for_gap(
            knowledge_gap=knowledge_gap,
            score=gap.get("score"),
        )

        # Keep the learning outcome so the frontend knows
        # which LO the recommendation belongs to.
        recommendation["lo_code"] = gap.get("lo_code")

        # Include the original feedback for transparency.
        recommendation["feedback"] = gap.get("feedback")

        recommendations.append(recommendation)

    # Highest-priority recommendations first
    priority_order = {
        "high": 0,
        "medium": 1,
        "low": 2,
    }

    recommendations.sort(
        key=lambda item: priority_order.get(item["priority"], 3)
    )

    return recommendations