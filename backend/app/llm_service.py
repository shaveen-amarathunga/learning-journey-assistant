import json
import os

from dotenv import load_dotenv
from groq import Groq


# Load environment variables from backend/.env
load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


def generate_llm_recommendation(student_data):
    """
    Generate a personalised learning recommendation using an LLM.

    student_data should contain:
    - lo_code
    - knowledge_gap
    - score
    - feedback
    """

    prompt = f"""
You are an AI learning assistant for university students.

Use the student's assessment feedback and identified knowledge gap
to generate a personalised learning plan.

Learning outcome: {student_data.get("lo_code", "Not provided")}
Mastery score: {student_data.get("score", "Not provided")}
Knowledge gap: {student_data.get("knowledge_gap", "Not provided")}
Lecturer feedback: {student_data.get("feedback", "Not provided")}

Return ONLY valid JSON using this exact structure:

{{
    "explanation": "A short and simple explanation of what the student needs to improve.",
    "learning_activities": [
        "Activity 1",
        "Activity 2",
        "Activity 3"
    ],
    "practical_exercise": "One practical exercise the student can complete.",
    "study_priority": "A short statement explaining what the student should focus on first."
}}

Do not invent information about the student's course.
Do not recommend a specific programming language, framework or library
unless it is named in the feedback.
Base the recommendation only on the information provided.
"""

    try:
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful university learning assistant."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        result = response.choices[0].message.content

        return json.loads(result)

    except Exception as error:
        return {
            "error": str(error)
        }
def generate_student_ai_recommendations(knowledge_gaps):
    """
    Generate LLM-powered personalised recommendations
    for a student's identified knowledge gaps.
    """

    recommendations = []

    for gap in knowledge_gaps:

        student_data = {
            "lo_code": gap.get("lo_code"),
            "score": gap.get("score"),
            "knowledge_gap": gap.get("knowledge_gap"),
            "feedback": gap.get("feedback")
        }

        llm_result = generate_llm_recommendation(student_data)

        recommendation = {
            "lo_code": gap.get("lo_code"),
            "knowledge_gap": gap.get("knowledge_gap"),
            "score": gap.get("score"),
            "feedback": gap.get("feedback"),
            "ai_recommendation": llm_result
        }

        recommendations.append(recommendation)

    return recommendations

# ===========================================================================
# ADAPTIVE QUIZ GENERATION
# ===========================================================================

def difficulty_for_mastery(mastery):
    """Pick a quiz difficulty from the student's current mastery (0-100)."""
    if mastery < 50:
        return "foundational"
    if mastery < 75:
        return "intermediate"
    return "advanced"


def _valid_question(question):
    options = question.get("options")
    if not isinstance(options, list) or len(options) != 4:
        return False
    keys = [option.get("key") for option in options]
    return (
        keys == ["A", "B", "C", "D"]
        and all(isinstance(option.get("text"), str) and option["text"].strip() for option in options)
        and question.get("correctKey") in keys
        and isinstance(question.get("prompt"), str)
        and question["prompt"].strip()
    )


def generate_adaptive_quiz(quiz_context, num_questions=5):
    """
    Generate a multiple-choice quiz for one learning outcome using the LLM.

    quiz_context should contain:
    - subject_name
    - lo_code
    - lo_description
    - mastery
    - feedback (list of lecturer comments for this learning outcome)
    - knowledge_gaps (list of gap names identified by the NLP analyser)

    The questions are grounded in the learning outcome, the student's own
    feedback and their knowledge gaps, and the difficulty adapts to their
    current mastery.
    """

    difficulty = difficulty_for_mastery(quiz_context.get("mastery", 0))
    feedback_lines = "\n".join(
        f"- {comment}" for comment in quiz_context.get("feedback", [])
    ) or "- No feedback available"
    gap_lines = "\n".join(
        f"- {gap}" for gap in quiz_context.get("knowledge_gaps", [])
    ) or "- No specific gaps identified"

    prompt = f"""
You are creating a short formative practice quiz for a university student.

Subject: {quiz_context.get("subject_name", "Not provided")}
Learning outcome {quiz_context.get("lo_code")}: {quiz_context.get("lo_description")}
Student's current mastery of this outcome: {quiz_context.get("mastery")}/100
Difficulty to target: {difficulty}

Knowledge gaps identified from the student's feedback:
{gap_lines}

Lecturer feedback the student received for this outcome:
{feedback_lines}

Write exactly {num_questions} multiple-choice questions that test the concepts
behind this learning outcome, focusing most on the knowledge gaps and the
weaknesses mentioned in the feedback. Each question must have 4 options
(A, B, C, D) with exactly one correct answer.

Return ONLY valid JSON using this exact structure:

{{
    "questions": [
        {{
            "prompt": "Question text",
            "options": [
                {{"key": "A", "text": "Option A"}},
                {{"key": "B", "text": "Option B"}},
                {{"key": "C", "text": "Option C"}},
                {{"key": "D", "text": "Option D"}}
            ],
            "correctKey": "B",
            "explanation": "One or two sentences explaining why the answer is correct.",
            "reviewLabel": "Short topic label (max 6 words)"
        }}
    ]
}}

Only use general concepts that belong to this learning outcome.
Do not assume a specific programming language, framework or tool unless it
is named in the learning outcome or the feedback.
Do not invent details about the student's course, marks or assessments.
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": "You are a helpful university learning assistant who writes accurate quiz questions."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.4,
        response_format={"type": "json_object"}
    )

    result = json.loads(response.choices[0].message.content)

    questions = [
        question
        for question in result.get("questions", [])
        if isinstance(question, dict) and _valid_question(question)
    ][:num_questions]

    if not questions:
        raise ValueError("The AI did not return any valid quiz questions")

    return {
        "difficulty": difficulty,
        "questions": [
            {
                "id": f"q{index + 1}",
                "prompt": question["prompt"].strip(),
                "options": [
                    {"key": option["key"], "text": option["text"].strip()}
                    for option in question["options"]
                ],
                "correctKey": question["correctKey"],
                "explanation": str(question.get("explanation", "")).strip(),
                "reviewLabel": str(question.get("reviewLabel", "")).strip()
                or f"Question {index + 1}",
            }
            for index, question in enumerate(questions)
        ],
    }
