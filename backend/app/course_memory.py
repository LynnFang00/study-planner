from sqlalchemy.orm import Session
from app.models import Task, Course
from typing import Dict
import re


def get_known_courses(db: Session) -> Dict[str, str]:
    """
    Get course abbreviations from:
    1. User's registered courses (primary source)
    2. Past tasks (fallback)
    """
    course_map = {}

    # First, get explicitly registered courses
    registered_courses = db.query(Course).all()
    for course in registered_courses:
        code = course.code.upper()
        course_map[code] = code

        # Extract numbers (e.g., "102" from "ECO102")
        numbers = re.findall(r'\d+', code)
        if numbers:
            course_map[numbers[0]] = code

        # Extract letters (e.g., "ECO" from "ECO102")
        letters = re.findall(r'[A-Z]+', code)
        if letters:
            course_map[letters[0]] = letters[0]

    # Then add from past tasks (if not already in map)
    tasks = db.query(Task).filter(Task.course.isnot(None)).all()
    for task in tasks:
        code = task.course.strip().upper()
        if code and code not in course_map:
            course_map[code] = code

            numbers = re.findall(r'\d+', code)
            if numbers and numbers[0] not in course_map:
                course_map[numbers[0]] = code

    return course_map


def resolve_course_abbreviation(text: str, db: Session) -> str:
    """
    Try to resolve course abbreviations in text.
    Example: "102" -> "ECO102" if user registered ECO102
    """
    course_map = get_known_courses(db)

    # Check for standalone numbers (e.g., "102")
    numbers = re.findall(r'\b\d{3}\b', text)
    for num in numbers:
        if num in course_map:
            return course_map[num]

    # Check for course codes (e.g., "ECO102")
    codes = re.findall(r'\b[A-Z]{3}\d{3}\b', text.upper())
    for code in codes:
        if code in course_map:
            return course_map[code]

    return None