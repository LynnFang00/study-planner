from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional


# ===== TASK SCHEMAS =====

class TaskCreate(BaseModel):
    """Schema for creating a new task"""
    title: str
    course: Optional[str] = None
    due_date: datetime
    estimated_minutes: int
    priority: Optional[int] = 3


class TaskResponse(BaseModel):
    """Schema for returning task data"""
    id: int
    title: str
    course: Optional[str]
    due_date: datetime
    estimated_minutes: int
    priority: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True  # Allows conversion from SQLAlchemy model


# ===== EVENT SCHEMAS =====

class EventCreate(BaseModel):
    """Schema for creating a new event"""
    title: str
    day_of_week: str  # "Monday", "Tuesday", etc.
    start_time: str  # "10:00"
    end_time: str  # "11:00"
    event_type: Optional[str] = "other"


class EventResponse(BaseModel):
    """Schema for returning event data"""
    id: int
    title: str
    day_of_week: str
    start_time: str
    end_time: str
    event_type: str

    class Config:
        from_attributes = True


# ===== CHECK-IN SCHEMAS =====

class CheckInCreate(BaseModel):
    """Schema for daily check-in"""
    energy_level: Optional[int] = None
    notes: Optional[str] = None
    completed_tasks: Optional[str] = None


class CheckInResponse(BaseModel):
    """Schema for returning check-in data"""
    id: int
    date: datetime
    energy_level: Optional[int]
    notes: Optional[str]

    class Config:
        from_attributes = True


# add courses
class CourseCreate(BaseModel):
    code: str
    name: Optional[str] = None
    term: Optional[str] = None
    color: Optional[str] = '#667eea'


class CourseResponse(BaseModel):
    id: int
    code: str
    name: Optional[str]
    term: Optional[str]
    color: str

    class Config:
        from_attributes = True


# ===== CLASS SCHEDULE SCHEMAS =====
class ClassScheduleCreate(BaseModel):
    course_id: int
    class_type: str  # 'lecture', 'tutorial', 'lab', 'practical'
    day_of_week: int  # 0=Monday, 6=Sunday
    start_time: str  # '10:00'
    end_time: str  # '11:00'
    location: Optional[str] = None

class ClassScheduleResponse(BaseModel):
    id: int
    course_id: int
    class_type: str
    day_of_week: int
    start_time: str
    end_time: str
    location: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# ===== TERM CONFIG SCHEMAS =====
class TermConfigCreate(BaseModel):
    term_name: str  # 'Fall 2025'
    start_date: date
    end_date: date
    reading_week_start: Optional[date] = None
    reading_week_end: Optional[date] = None
    exam_period_start: Optional[date] = None
    exam_period_end: Optional[date] = None

class TermConfigResponse(BaseModel):
    id: int
    term_name: str
    start_date: date
    end_date: date
    reading_week_start: Optional[date]
    reading_week_end: Optional[date]
    exam_period_start: Optional[date]
    exam_period_end: Optional[date]
    is_active: int
    created_at: datetime

    class Config:
        from_attributes = True