from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime


class Task(Base):
    """
    Stores user tasks/assignments
    Example: "CSC209 assignment due Feb 15"
    """
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    title = Column(String, nullable=False)
    course = Column(String, nullable=True)  # e.g., "CSC209"
    due_date = Column(DateTime, nullable=False)
    estimated_minutes = Column(Integer, nullable=False)
    priority = Column(Integer, default=3)  # 1 (low) to 5 (high)
    status = Column(String, default="todo")  # todo, in_progress, done
    created_at = Column(DateTime, default=datetime.utcnow)


class Event(Base):
    """
    Stores recurring events (lectures, gym, work)
    Example: "Lecture Monday 10-11am"
    """
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    title = Column(String, nullable=False)
    day_of_week = Column(String, nullable=False)  # Monday, Tuesday, etc.
    start_time = Column(String, nullable=False)  # "10:00"
    end_time = Column(String, nullable=False)  # "11:00"
    event_type = Column(String, default="other")  # lecture, work, gym, etc.
    created_at = Column(DateTime, default=datetime.utcnow)


class Preference(Base):
    """
    Stores learned user preferences
    Example: key="best_study_time", value="morning", confidence=0.8
    """
    __tablename__ = "preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    key = Column(String, nullable=False)
    value = Column(String, nullable=False)
    confidence = Column(Float, default=0.5)  # 0.0 to 1.0
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CheckIn(Base):
    """
    Stores daily check-ins from user
    Example: energy_level=3, notes="Was tired, gym helped"
    """
    __tablename__ = "checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    date = Column(DateTime, nullable=False, default=datetime.utcnow)
    energy_level = Column(Integer, nullable=True)  # 1-5
    notes = Column(Text, nullable=True)
    completed_tasks = Column(Text, nullable=True)  # JSON string of task IDs
    created_at = Column(DateTime, default=datetime.utcnow)


class RecurringTask(Base):
    __tablename__ = "recurring_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    title = Column(String, nullable=False)
    course = Column(String, nullable=True)
    frequency = Column(String, nullable=False)
    day_of_week = Column(String, nullable=True)
    time = Column(String, nullable=True)
    estimated_minutes = Column(Integer, nullable=False)
    priority = Column(Integer, default=3)
    created_at = Column(DateTime, default=datetime.utcnow)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    code = Column(String, nullable=False)
    name = Column(String, nullable=True)
    term = Column(String, nullable=True)
    color = Column(String, default='#667eea')
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship to class schedules
    schedules = relationship("ClassSchedule", back_populates="course", cascade="all, delete-orphan")


class ClassSchedule(Base):
    """
    Stores weekly class schedule for each course
    Example: MAT224 - Lecture Monday 10-11am, Tutorial Thursday 2-3pm
    """
    __tablename__ = "class_schedules"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey('courses.id'), nullable=False)
    class_type = Column(String, nullable=False)  # 'lecture', 'tutorial', 'lab', 'practical'
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    start_time = Column(String, nullable=False)  # '10:00'
    end_time = Column(String, nullable=False)  # '11:00'
    location = Column(String, nullable=True)  # 'BA 1130' or 'Online'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship back to course
    course = relationship("Course", back_populates="schedules")


class TermConfig(Base):
    """
    Stores term configuration (semester dates, reading week, etc.)
    Only one active term at a time
    """
    __tablename__ = "term_config"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    term_name = Column(String, nullable=False)  # 'Fall 2025', 'Winter 2026'
    start_date = Column(Date, nullable=False)  # First day of classes
    end_date = Column(Date, nullable=False)  # Last day of classes
    reading_week_start = Column(Date, nullable=True)  # Start of reading week
    reading_week_end = Column(Date, nullable=True)  # End of reading week
    exam_period_start = Column(Date, nullable=True)  # First day of exams
    exam_period_end = Column(Date, nullable=True)  # Last day of exams
    is_active = Column(Integer, default=1)  # Only one active term
    created_at = Column(DateTime, default=datetime.utcnow)


class GradeItem(Base):
    __tablename__ = "grade_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    course = Column(String, nullable=False)
    title = Column(String, nullable=False)
    grade = Column(Float, nullable=True)        # percentage earned, e.g. 82.5
    weight = Column(Float, nullable=False)      # weight in final grade, e.g. 30.0
    created_at = Column(DateTime, default=datetime.utcnow)