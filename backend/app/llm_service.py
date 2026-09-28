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