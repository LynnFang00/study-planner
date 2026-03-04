import os
import httpx
from pathlib import Path

# Manually load .env so BOM / path issues don't block key loading
_env_path = Path(__file__).parent.parent / '.env'
if _env_path.exists():
    with open(_env_path, encoding='utf-8-sig') as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _k, _, _v = _line.partition('=')
                os.environ[_k.strip()] = _v.strip()

def call_groq(messages, max_tokens=500, temperature=0.5):
    """Call Groq API directly via httpx - no groq package needed"""
    api_key = os.getenv('GROQ_API_KEY')
    response = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature
        },
        timeout=60
    )
    data = response.json()
    if "choices" not in data:
        error_msg = data.get("error", {}).get("message", str(data))
        raise ValueError(f"Groq API error: {error_msg}")
    return data["choices"][0]["message"]["content"]


def analyze_checkin(notes: str, energy_level: int) -> dict:
    """Use Groq AI to analyze check-in notes"""

    prompt = f"""You are analyzing a student's daily check-in to learn their study preferences.

Energy Level: {energy_level}/5
Notes: {notes}

Please analyze this and extract:
1. Preferred study times (morning/afternoon/evening)
2. Preferred study locations (library/home/cafe)
3. Preferred session length (short breaks / long focused sessions)

Return ONLY valid JSON with this structure:
{{
  "preferences": {{
    "best_time": "morning",
    "location": "library",
    "session_length": "short"
  }},
  "insights": "Brief insight about study habits",
  "confidence": 0.8
}}

Only extract preferences clearly mentioned. Use null for anything not mentioned."""

    try:
        import json
        import re

        response_text = call_groq([{"role": "user", "content": prompt}], max_tokens=500, temperature=0.5)
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)

        if json_match:
            return json.loads(json_match.group())
        else:
            return {"error": "Could not parse response"}

    except Exception as e:
        print(f"AI Error: {e}")
        return {"error": str(e)}


def generate_task_explanation(task_title: str, priority: int, due_date: str,
                              scheduled_time: str, available_gap: int) -> str:
    """Generate AI explanation for task scheduling"""

    prompt = f"""Explain in ONE SHORT sentence (under 15 words) why this task was scheduled now:

Task: {task_title}
Priority: {priority}/5
Due: {due_date}
Time: {scheduled_time}
Gap: {available_gap} min

Be concise and practical."""

    try:
        return call_groq([{"role": "user", "content": prompt}], max_tokens=50, temperature=0.3).strip()

    except Exception as e:
        return f"Priority {priority}/5, available time slot"


def calculate_due_date(text: str) -> dict:
    """Calculate actual due date from natural language"""
    from datetime import datetime, timedelta

    today = datetime.now()
    text_lower = text.lower()

    print(f"DEBUG: Today is {today.strftime('%A, %Y-%m-%d')} (weekday={today.weekday()})")

    # Map day names to numbers
    days = {
        'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
        'friday': 4, 'saturday': 5, 'sunday': 6
    }

    # Check for specific day mentions
    for day_name, day_num in days.items():
        if day_name in text_lower:
            # Calculate days until that day
            current_day = today.weekday()
            days_ahead = day_num - current_day

            print(f"DEBUG: Found '{day_name}' (day_num={day_num})")
            print(f"DEBUG: Current day={current_day}, days_ahead={days_ahead}")

            # If the day has passed this week, go to next week
            if days_ahead <= 0:
                days_ahead += 7

            target_date = today + timedelta(days=days_ahead)
            print(f"DEBUG: Target date = {target_date.strftime('%A, %Y-%m-%d')}")

            return {
                'date': target_date.strftime('%Y-%m-%d'),
                'found': True
            }

    # Check for relative dates
    if 'tomorrow' in text_lower:
        target_date = today + timedelta(days=1)
        return {'date': target_date.strftime('%Y-%m-%d'), 'found': True}

    if 'today' in text_lower:
        return {'date': today.strftime('%Y-%m-%d'), 'found': True}

    # Default: 7 days from now
    default_date = today + timedelta(days=7)
    return {'date': default_date.strftime('%Y-%m-%d'), 'found': False}


def parse_natural_language_task(text: str) -> dict:
    """Convert natural language to task parameters using AI"""

    from datetime import datetime

    # Calculate the actual due date using our helper
    date_info = calculate_due_date(text)

    # Get current date for context
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")
    day_name = today.strftime("%A")

    # Build prompt - make it clear the date is FINAL
    prompt = f"""Convert this to a task. Return ONLY valid JSON:

Input: "{text}"

CRITICAL: Use EXACTLY this due_date: {date_info['date']} (DO NOT change it)

{{
  "title": "Short task title",
  "course": "Course code or null",
  "due_date": "{date_info['date']}",
  "due_time": "09:00",
  "estimated_minutes": 90,
  "priority": 4
}}

Instructions:
- due_date MUST be exactly: {date_info['date']}
- Extract the due_time from text if mentioned (like "9am" → "09:00", "2pm" → "14:00")
- If no time mentioned, use "23:59"
- Estimate minutes: exam=180, assignment=120, reading=60, practice=90
- Priority: exam=5, assignment=4, reading=3, practice=3"""

    try:
        import json
        import re

        response_text = call_groq([{"role": "user", "content": prompt}], max_tokens=200, temperature=0.1)
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)

        if json_match:
            result = json.loads(json_match.group())
            result['due_date'] = date_info['date']
            return result
        else:
            return {"error": "Could not parse task"}

    except Exception as e:
        return {"error": str(e)}


def get_study_advice(question: str, user_preferences: dict = None) -> str:
    """Get study advice from AI"""

    context = ""
    if user_preferences:
        context = f"\nUser preferences: {user_preferences}"

    prompt = f"""Answer this study question in 2-3 sentences. Be helpful and concise.

Question: {question}{context}"""

    try:
        return call_groq([{"role": "user", "content": prompt}], max_tokens=150, temperature=0.7).strip()

    except Exception as e:
        return f"Error: {str(e)}"


def conversational_task_extraction(conversation: str, db) -> dict:
    """Extract multiple SEPARATE tasks from natural conversation."""

    from datetime import datetime
    from app.course_memory import get_known_courses, resolve_course_abbreviation

    # Get known courses
    known_courses = get_known_courses(db)
    course_list = ', '.join(sorted(set(known_courses.values())))
    course_context = f"\n\nKnown courses from past tasks: {course_list}" if known_courses else ""

    # Try to resolve abbreviations in the text
    resolved_course = resolve_course_abbreviation(conversation, db)
    course_hint = f"\nLikely referring to: {resolved_course}" if resolved_course else ""

    # DEBUG - Print what we're sending to the AI
    print("=" * 50)
    print("DEBUG: Known courses:", known_courses)
    print("DEBUG: Resolved course:", resolved_course)
    print("DEBUG: Course context:", course_context)
    print("=" * 50)

    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d (%A)")

    prompt = f"""You are an intelligent study planning assistant analyzing a student's message.

    DETECT RECURRING PATTERNS:
    - "every Monday" or "due every week" = weekly recurring
    - If they mention a recurring pattern, set "is_recurring": true and "frequency": "weekly"

    Today is {today_str}.{course_context}{course_hint}

    Student says: "{conversation}"

    CRITICAL COURSE MATCHING RULES:
    - If they mention just a number like "102", match it to a known course (e.g., ECO102)
    - Use EXACTLY the same course code format as their past tasks
    - If they say "102 assignment", extract course as "ECO102" (not just "102")


    IMPORTANT COURSE MATCHING:
    - If they say just a number like "209", match it to known courses (e.g., CSC209)
    - If they mention a course you've seen before, use the exact same format
    - Be consistent with course naming

    Your job:
    1. Extract ALL tasks/assignments/exams mentioned
    2. IMPORTANT: If they mention "exam AND assignment" or multiple things together, create SEPARATE tasks for each
    3. Break down vague items into specific tasks

Examples:
- "CSC263 exam and assignments" → Create 2-3 separate tasks (exam prep, assignment 1, assignment 2)
- "Study for midterm" → Create specific task for exam prep
- "Finish homework" → Keep as one task if no details given

Return JSON:
{{
  "tasks_found": [
    {{
      "title": "Specific task title (be precise)",
      "course": "Course code or null",
      "due_date": "YYYY-MM-DD",
      "due_time": "HH:MM",
      "estimated_minutes": 90,
      "priority": 4,
      "confidence": 0.9,
      "is_recurring": false,
      "frequency": "weekly/daily/monthly or null",
      "day_of_week": "Monday/Tuesday etc or null",
      "notes": "Brief note about this specific task"
    }}
  ],
  "ai_response": "Empathetic response acknowledging their workload and the breakdown",
  "recommendations": [
    "Specific actionable recommendation"
  ],
  "tone_detected": "stressed/confident/overwhelmed/neutral"
}}

CRITICAL RULES:
- One exam = ONE task for exam prep
- One assignment = ONE task  
- "Exam and assignments" = MULTIPLE separate tasks
- Be specific in titles (not "CSC263 stuff" but "CSC263 Midterm Prep" + "CSC263 Assignment 3")
- Only include tasks with confidence > 0.6
- Estimate reasonable time for EACH separate task"""

    try:
        import json
        import re

        response_text = call_groq([{"role": "user", "content": prompt}], max_tokens=1000, temperature=0.4)
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)

        if json_match:
            return json.loads(json_match.group())
        else:
            return {"error": "Could not parse response"}

    except Exception as e:
        return {"error": str(e)}


def analyze_checkin_for_tasks(notes: str, energy_level: int, completed_tasks: str) -> dict:
    """
    Analyze end-of-day check-in and suggest tasks user might have mentioned or forgotten.
    """

    from datetime import datetime
    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d (%A)")

    prompt = f"""You are analyzing a student's end-of-day reflection to help them stay organized.

Today is {today_str}.

Their check-in:
- Energy Level: {energy_level}/5
- Notes: "{notes}"
- Completed today: "{completed_tasks}"

Your job:
1. Extract any tasks/deadlines they mentioned
2. Identify things they're worried about
3. Suggest what they should work on tomorrow

Return JSON:
{{
  "suggested_tasks": [
    {{
      "title": "Task title",
      "course": "Course or null",
      "due_date": "YYYY-MM-DD",
      "estimated_minutes": 90,
      "priority": 4,
      "reason": "Why you're suggesting this"
    }}
  ],
  "insights": "What you noticed about their study habits or stress level",
  "encouragement": "Brief encouraging message based on their day"
}}

Be helpful but not pushy. Only suggest tasks clearly mentioned."""

    try:
        import json
        import re

        response_text = call_groq([{"role": "user", "content": prompt}], max_tokens=600, temperature=0.5)
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)

        if json_match:
            return json.loads(json_match.group())
        else:
            return {"error": "Could not parse response"}

    except Exception as e:
        return {"error": str(e)}


def extract_syllabus_tasks(syllabus_text: str, course_code: str, db, course_id: int = None) -> dict:
    """
    Use AI to extract assignments and due dates from syllabus text.
    NOW ENHANCED: Uses course schedule and term config for intelligent date calculation!
    """

    from datetime import datetime, timedelta
    from app.models import ClassSchedule, TermConfig

    today = datetime.now()

    # NEW: Get term configuration
    term_config = None
    term_context = ""
    try:
        term_config = db.query(TermConfig).filter(TermConfig.is_active == 1).first()
        if term_config:
            term_context = f"""
TERM CONFIGURATION (Use this for date calculations):
- Term: {term_config.term_name}
- Start Date: {term_config.start_date}
- End Date: {term_config.end_date}
- Reading Week: {term_config.reading_week_start} to {term_config.reading_week_end if term_config.reading_week_start else 'None'}
- Exam Period: {term_config.exam_period_start} to {term_config.exam_period_end if term_config.exam_period_start else 'None'}

IMPORTANT: Use these dates to calculate:
- "Week 1" = week starting {term_config.start_date}
- "Week 5" = 4 weeks after term start
- Skip reading week when counting weeks
"""
    except Exception as e:
        print(f"Could not load term config: {e}")

    # NEW: Get course schedule (lectures, tutorials, labs)
    schedule_context = ""
    day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    if course_id:
        try:
            schedules = db.query(ClassSchedule).filter(ClassSchedule.course_id == course_id).all()
            if schedules:
                schedule_list = []
                for sched in schedules:
                    day_name = day_names[sched.day_of_week]
                    schedule_list.append(
                        f"  - {sched.class_type.title()}: {day_name} {sched.start_time}-{sched.end_time}")

                schedule_context = f"""
COURSE SCHEDULE (Use this for recurring tasks):
{chr(10).join(schedule_list)}

CRITICAL: If syllabus mentions "tutorial quiz every week" or similar:
1. Look at the tutorial day above
2. Generate tasks on that day every week
3. Skip reading week
4. Use term start/end dates to determine total weeks
"""
        except Exception as e:
            print(f"Could not load course schedule: {e}")

    # Truncate to avoid Groq token limits (keep first 20000 chars; schedules are near the top)
    syllabus_text = syllabus_text[:20000]

    prompt = f"""You are analyzing a course syllabus to extract assignments and due dates.

    Course: {course_code}
    Today's date: {today.strftime('%Y-%m-%d')}
    {term_context}{schedule_context}

    FULL SYLLABUS TEXT (READ CAREFULLY):
    {syllabus_text}

    CRITICAL: You MUST return valid JSON. Do NOT return explanatory text, tables, or chapter lists.
    CRITICAL: Even if you find NO tasks, return {{"tasks": [], "course_info": {{"course_code": "{course_code}", "course_name": "", "term": ""}}}}

    INCLUDE ALL GRADE-BEARING COMPONENTS — even recurring ones like weekly PCRS, labs, quizzes, surveys.
    A task counts if it has ANY weight/percentage toward the final grade.

    STEP-BY-STEP EXTRACTION:
    1. Find sections titled: "Schedule", "Important Dates", "Evaluation", "Grading", "Assessments", "Marking Scheme"
    2. For EVERY graded item found (tests, assignments, quizzes, labs, PCRS, surveys, projects, participation):
       - Extract the name
       - Extract the date or day+week pattern
       - Extract the explicit time if stated
       - Note the weight (e.g. "5%", "10%")

    CRITICAL TIME PARSING — always extract the EXPLICIT time from the syllabus text:
    - "before 10pm" → "22:00"
    - "before 9am" → "09:00"
    - "before 11:59pm" → "23:59"
    - "6:10pm" → "18:10"
    - "during lecture" → "18:00" (or use schedule time if available)
    - Only use default times when NO time is mentioned at all

    CRITICAL DATE PARSING:
    - "Oct 15" → "2025-10-15" (use 2025 for fall term, 2026 for winter/spring term)
    - "Thu 29 Jan" → "2026-01-29"
    - "Tue 3 Feb" → "2026-02-03"
    - "TBA" or "during exam period" → use exam_period_start date if available, otherwise skip

    FOR RECURRING TASKS (e.g., "Tuesdays before 9am weeks 2-12", "Fridays before 10pm weeks 1-11"):
    - Generate one task per occurrence
    - Use the day of week + week number to calculate each date from term start
    - Skip reading week if term config is provided
    - If no term start date is available, use reasonable estimates based on today's date and term

    Return ONLY this JSON structure (NO markdown, NO code blocks, NO explanations):
    {{
      "tasks": [
        {{
          "title": "Task name",
          "type": "exam",
          "due_date": "2026-01-29",
          "due_time": "22:00",
          "estimated_minutes": 30,
          "priority": 3,
          "notes": "5% weight"
        }}
      ],
      "course_info": {{
        "course_code": "{course_code}",
        "course_name": "Name from syllabus if found",
        "term": "Fall 2025 or Winter 2026 or whatever term you find"
      }}
    }}

    DEFAULT VALUES (only use when not explicitly stated in syllabus):
    - Type: "exam" for tests/midterms/finals, "quiz" for quizzes/PCRS/surveys, "assignment" for homework/labs/projects
    - Time: "18:00" for exams, "22:00" for assignments/labs, "23:59" only if no time mentioned at all
    - Estimated minutes: 120 for midterms, 180 for finals, 20 for PCRS/surveys, 60 for labs, 90 for assignments
    - Priority: 5 for exams, 4 for assignments/projects, 3 for quizzes/labs/PCRS

    REMEMBER: Output ONLY valid JSON with the exact structure shown above. No other text."""

    try:
        import json
        import re

        response_text = call_groq([{"role": "user", "content": prompt}], max_tokens=4000, temperature=0.1)

        print("=" * 50)
        print("DEBUG: Raw AI response (enhanced parser):")
        print(response_text[:1500])
        print("=" * 50)

        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)

        if json_match:
            result = json.loads(json_match.group())
            print(f"DEBUG: Successfully parsed {len(result.get('tasks', []))} tasks from AI (with schedule data)")
            return result
        else:
            print("ERROR: Could not find JSON in AI response")
            return {"error": "Could not parse syllabus", "tasks": []}

    except Exception as e:
        print(f"ERROR in extract_syllabus_tasks: {e}")
        import traceback
        traceback.print_exc()
        return {"error": str(e), "tasks": []}