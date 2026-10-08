from datetime import datetime, timedelta

from app import create_app
from app.models import (
    db,
    Student,
    LearningOutcome,
    RubricFeedback,
)
from app.mastery_calculator import calculate_mastery_for_all_students


# Two feedback rounds per subject, each covering all five LOs.
SUBJECT_CONFIG = {
    "CSE2ML": {
        "assessments": [4, 5],
        "comments": {
            "LO1": [
                "Good preprocessing overall, but be careful to fit scaling and encoding only on the training data to avoid data leakage.",
                "The preprocessing pipeline is clearer now. Missing values, categorical encoding, and feature scaling are handled appropriately.",
            ],
            "LO2": [
                "The classification model works, but the choice of algorithm needs stronger justification based on the characteristics of the dataset.",
                "Good comparison of supervised models. The explanation of why one model performs better is supported by the results.",
            ],
            "LO3": [
                "Accuracy alone is not enough for this dataset. Include precision, recall, F1-score, and cross-validation when evaluating the model.",
                "Model evaluation has improved with cross-validation and multiple metrics. The discussion of overfitting could be more detailed.",
            ],
            "LO4": [
                "Hyperparameters are mostly left at default values. Use a systematic tuning method and explain which parameters have the greatest effect.",
                "Good use of hyperparameter tuning. Feature selection is sensible, although the reasoning for removing some features should be clearer.",
            ],
            "LO5": [
                "The clustering implementation is correct, but scaling and the choice of cluster count need more justification.",
                "Good use of K-Means and cluster analysis. Consider using a metric such as silhouette score to support the selected number of clusters.",
            ],
        },
    },
    "CSE2DBF": {
        "assessments": [7, 8],
        "comments": {
            "LO1": [
                "The ER model identifies the main entities, but some relationship cardinalities and foreign-key mappings need correction.",
                "The relational design is much clearer. Primary keys, foreign keys, and relationships are identified correctly.",
            ],
            "LO2": [
                "The tables reach 2NF, but some functional dependencies still need to be resolved before the design is fully in 3NF.",
                "Good normalization process with clear identification of functional dependencies and appropriate decomposition to 3NF.",
            ],
            "LO3": [
                "Basic SQL queries are correct, but joins, GROUP BY operations, and subqueries need more practice.",
                "Strong improvement in SQL. Joins and aggregate queries are correct, though one nested query could be simplified.",
            ],
            "LO4": [
                "Constraints are used appropriately, but the explanation of transactions, ACID properties, and indexing is limited.",
                "Good use of integrity constraints and indexes. The transaction discussion demonstrates a clearer understanding of consistency and rollback.",
            ],
            "LO5": [
                "The conceptual model has been converted to tables, but some relationship mappings and SQL DDL choices need refinement.",
                "The conceptual-to-relational mapping is accurate and the resulting schema is implemented cleanly in the DBMS.",
            ],
        },
    },
}


# Base ability profiles create realistic differences between students while
# keeping every student strong in some areas and weaker in others.
STUDENT_BASE = {
    "S001": 82.0,
    "S002": 75.0,
    "S003": 88.0,
    "S004": 69.0,
    "S005": 79.0,
}

LO_ADJUSTMENT = {
    "LO1": 2.0,
    "LO2": -1.0,
    "LO3": -4.0,
    "LO4": -2.0,
    "LO5": 1.0,
}


def feedback_exists(student_id, assessment_id, lo_id):
    return RubricFeedback.query.filter_by(
        student_id=student_id,
        assessment_id=assessment_id,
        lo_id=lo_id,
    ).first() is not None


def add_feedback():
    created = 0
    skipped = 0

    students = Student.query.order_by(Student.id).all()

    for subject_code, config in SUBJECT_CONFIG.items():
        outcomes = {
            lo.lo_code: lo
            for lo in LearningOutcome.query.filter_by(
                subject_code=subject_code
            ).all()
        }

        if len(outcomes) != 5:
            raise RuntimeError(
                f"{subject_code} should have 5 learning outcomes, "
                f"but found {len(outcomes)}."
            )

        for round_index, assessment_id in enumerate(config["assessments"]):
            for student_index, student in enumerate(students):
                if student.id not in STUDENT_BASE:
                    continue

                for lo_code in ["LO1", "LO2", "LO3", "LO4", "LO5"]:
                    lo = outcomes[lo_code]

                    if feedback_exists(student.id, assessment_id, lo.id):
                        skipped += 1
                        continue

                    # Second assessment shows modest improvement.
                    improvement = 4.5 if round_index == 1 else 0.0

                    # Small deterministic variation prevents every LO from
                    # having mechanically identical scores.
                    variation = (
                        ((student_index + int(lo_code[-1]) + round_index) % 5)
                        - 2
                    ) * 0.7

                    score = (
                        STUDENT_BASE[student.id]
                        + LO_ADJUSTMENT[lo_code]
                        + improvement
                        + variation
                    )
                    score = round(max(0.0, min(100.0, score)), 1)

                    created_at = (
                        datetime(2026, 7, 20)
                        + timedelta(days=(round_index * 24))
                        + timedelta(minutes=student_index * 10 + int(lo_code[-1]))
                    )

                    db.session.add(
                        RubricFeedback(
                            assessment_id=assessment_id,
                            student_id=student.id,
                            lo_id=lo.id,
                            comment=config["comments"][lo_code][round_index],
                            score=score,
                            created_at=created_at,
                        )
                    )
                    created += 1

    return created, skipped


def main():
    app = create_app()

    with app.app_context():
        try:
            created, skipped = add_feedback()
            db.session.commit()

            mastery_results = calculate_mastery_for_all_students()

            print("Multi-subject feedback added successfully.")
            print(f"Feedback: {created} created, {skipped} already existed")
            print(f"Mastery recalculated for {len(mastery_results)} students")
            print(f"Total feedback rows: {RubricFeedback.query.count()}")

            from app.models import MasteryScore
            print(f"Total mastery rows: {MasteryScore.query.count()}")

        except Exception:
            db.session.rollback()
            raise


if __name__ == "__main__":
    main()
