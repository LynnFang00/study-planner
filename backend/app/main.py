from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

from app.database import engine, Base, get_db, SessionLocal
from app.models import Task, Event, CheckIn, Course, ClassSchedule, TermConfig
from app.auth import get_current_user_id
from app.schemas import (TaskCreate, TaskResponse,
                         EventCreate, EventResponse,
                         CheckInCreate, CheckInResponse,
                         CourseCreate, CourseResponse,
                         ClassScheduleCreate, ClassScheduleResponse,
                         TermConfigCreate, TermConfigResponse
                         )

from fastapi import UploadFile, File
import shutil
import os
import uuid


print("=" * 50)
print("ADAPTIVE STUDY ENGINE - STARTING UP")
print("=" * 50)


def run_migrations(db):
    """Add user_id column to existing tables if missing; drop old unique constraints."""
    for table in ["tasks", "events", "checkins", "preferences", "courses", "class_schedules", "term_config"]:
        try:
            db.execute(text(f"ALTER TABLE {table} ADD COLUMN user_id VARCHAR"))
            db.commit()
        except Exception:
            db.rollback()
    for stmt in [
        "ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_code_key",
        "ALTER TABLE preferences DROP CONSTRAINT IF EXISTS preferences_key_key",
    ]:
        try:
            db.execute(text(stmt))
            db.commit()
        except Exception:
            db.rollback()
    try:
        db.execute(text("ALTER TABLE recurring_tasks ADD COLUMN user_id VARCHAR"))
        db.commit()
    except Exception:
        db.rollback()
    try:
        db.execute(text("""CREATE TABLE IF NOT EXISTS grade_items (
            id SERIAL PRIMARY KEY, user_id VARCHAR, course VARCHAR NOT NULL,
            title VARCHAR NOT NULL, grade FLOAT, weight FLOAT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW())"""))
        db.commit()
    except Exception:
        db.rollback()


with SessionLocal() as db:
    run_migrations(db)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="Adaptive Study Engine",
    description="Backend API for intelligent study planning",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://study-planner-6pe5.vercel.app",
    ],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoints
@app.get("/")
def root():
    return {
        "status": "alive",
        "message": "Adaptive Study Engine API",
        "version": "1.0.0"
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}



# ===== TASKS ROUTER =====
tasks_router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@tasks_router.post("/", response_model=TaskResponse)
def create_task(task: TaskCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Create a new task"""
    db_task = Task(
        user_id=user_id,
        title=task.title,
        course=task.course,
        due_date=task.due_date,
        estimated_minutes=task.estimated_minutes,
        priority=task.priority,
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@tasks_router.get("/", response_model=List[TaskResponse])
def get_tasks(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get all tasks"""
    return db.query(Task).filter(Task.user_id == user_id).all()


@tasks_router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get a specific task"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@tasks_router.put("/{task_id}/status", response_model=TaskResponse)
def update_task_status(task_id: int, status: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Update task status"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = status
    db.commit()
    db.refresh(task)
    return task


@tasks_router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Delete a task"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()
    return {"message": "Task deleted successfully"}

# Include the router
app.include_router(tasks_router)

# ===== EVENTS ROUTER =====
events_router = APIRouter(prefix="/api/events", tags=["events"])

@events_router.post("/", response_model=EventResponse)
def create_event(event: EventCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    db_event = Event(**event.dict(), user_id=user_id)
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event

@events_router.get("/", response_model=List[EventResponse])
def get_events(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return db.query(Event).filter(Event.user_id == user_id).all()

app.include_router(events_router)


# ===== CheckIn ROUTER =====
checkins_router = APIRouter(prefix="/api/checkins", tags=["checkins"])


@checkins_router.post("/", response_model=CheckInResponse)
def create_checkin(checkin: CheckInCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    db_checkin = CheckIn(
        user_id=user_id,
        energy_level=checkin.energy_level,
        notes=checkin.notes,
        completed_tasks=checkin.completed_tasks
    )
    db.add(db_checkin)
    db.commit()
    db.refresh(db_checkin)

    # Call memory system to process check-in
    from app.memory import process_daily_checkin
    process_daily_checkin(db, checkin.dict(), user_id)

    return db_checkin


@checkins_router.get("/", response_model=List[CheckInResponse])
def get_checkins(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    return db.query(CheckIn).filter(CheckIn.user_id == user_id).order_by(CheckIn.date.desc()).all()


@checkins_router.get("/latest", response_model=CheckInResponse)
def get_latest_checkin(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    checkin = db.query(CheckIn).filter(CheckIn.user_id == user_id).order_by(CheckIn.date.desc()).first()
    if not checkin:
        raise HTTPException(status_code=404, detail="No check-ins found")
    return checkin


@checkins_router.get("/streak")
def get_streak(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from datetime import date, timedelta
    rows = db.query(CheckIn).filter(CheckIn.user_id == user_id).order_by(CheckIn.date.desc()).all()
    if not rows:
        return {"streak": 0, "last_checkin": None}
    unique_dates = sorted(set(r.date.date() for r in rows), reverse=True)
    yesterday = date.today() - timedelta(days=1)
    if unique_dates[0] < yesterday:
        return {"streak": 0, "last_checkin": str(unique_dates[0])}
    streak, expected = 0, unique_dates[0]
    for d in unique_dates:
        if d == expected:
            streak += 1
            expected -= timedelta(days=1)
        else:
            break
    return {"streak": streak, "last_checkin": str(unique_dates[0])}


app.include_router(checkins_router)

@app.post("/api/plan/tomorrow")
def plan_tomorrow(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.planner import generate_tomorrow_plan
    plan = generate_tomorrow_plan(db, user_id)
    return plan


# ===== COURSES ROUTER =====
courses_router = APIRouter(prefix="/api/courses", tags=["courses"])

@courses_router.post("/", response_model=CourseResponse)
def create_course(course: CourseCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Add a course to your list"""
    db_course = Course(
        user_id=user_id,
        code=course.code.upper(),
        name=course.name,
        term=course.term,
        color=course.color or '#667eea'
    )
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

@courses_router.get("/", response_model=List[CourseResponse])
def get_courses(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get all your courses"""
    return db.query(Course).filter(Course.user_id == user_id).all()

@courses_router.delete("/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Remove a course"""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"message": "Course deleted"}

@courses_router.put("/{course_id}")
def update_course(course_id: int, course: CourseCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Update a course"""
    db_course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
    if not db_course:
        raise HTTPException(status_code=404, detail="Not found")
    db_course.name = course.name
    db_course.term = course.term
    if course.color:
        db_course.color = course.color
    db.commit()
    db.refresh(db_course)
    return db_course

app.include_router(courses_router)

# ===== CLASS SCHEDULES ROUTER =====
schedules_router = APIRouter(prefix="/api/schedules", tags=["schedules"])


@schedules_router.post("/", response_model=ClassScheduleResponse)
def create_class_schedule(schedule: ClassScheduleCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Add a class to the weekly schedule"""
    # Verify the course belongs to this user
    course = db.query(Course).filter(Course.id == schedule.course_id, Course.user_id == user_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db_schedule = ClassSchedule(
        course_id=schedule.course_id,
        class_type=schedule.class_type,
        day_of_week=schedule.day_of_week,
        start_time=schedule.start_time,
        end_time=schedule.end_time,
        location=schedule.location
    )
    db.add(db_schedule)
    db.commit()
    db.refresh(db_schedule)
    return db_schedule


@schedules_router.get("/course/{course_id}", response_model=List[ClassScheduleResponse])
def get_course_schedules(course_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get all class schedules for a specific course"""
    course = db.query(Course).filter(Course.id == course_id, Course.user_id == user_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return db.query(ClassSchedule).filter(ClassSchedule.course_id == course_id).all()


@schedules_router.get("/", response_model=List[ClassScheduleResponse])
def get_all_schedules(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get all class schedules"""
    user_course_ids = [c.id for c in db.query(Course).filter(Course.user_id == user_id).all()]
    return db.query(ClassSchedule).filter(ClassSchedule.course_id.in_(user_course_ids)).all()


@schedules_router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Delete a class schedule"""
    schedule = db.query(ClassSchedule).filter(ClassSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    # Verify ownership via course
    course = db.query(Course).filter(Course.id == schedule.course_id, Course.user_id == user_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()
    return {"message": "Schedule deleted"}


app.include_router(schedules_router)

# ===== TERM CONFIG ROUTER =====
term_router = APIRouter(prefix="/api/term", tags=["term"])


@term_router.post("/", response_model=TermConfigResponse)
def create_or_update_term(term: TermConfigCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Create or update term configuration"""
    # Deactivate all existing terms for this user
    db.query(TermConfig).filter(TermConfig.user_id == user_id).update({"is_active": 0})

    # Create new active term
    db_term = TermConfig(
        user_id=user_id,
        term_name=term.term_name,
        start_date=term.start_date,
        end_date=term.end_date,
        reading_week_start=term.reading_week_start,
        reading_week_end=term.reading_week_end,
        exam_period_start=term.exam_period_start,
        exam_period_end=term.exam_period_end,
        is_active=1
    )
    db.add(db_term)
    db.commit()
    db.refresh(db_term)
    return db_term


@term_router.get("/active", response_model=TermConfigResponse)
def get_active_term(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get the currently active term configuration"""
    term = db.query(TermConfig).filter(TermConfig.user_id == user_id, TermConfig.is_active == 1).first()
    if not term:
        raise HTTPException(status_code=404, detail="No active term configured")
    return term


@term_router.get("/", response_model=List[TermConfigResponse])
def get_all_terms(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get all term configurations"""
    return db.query(TermConfig).filter(TermConfig.user_id == user_id).all()


app.include_router(term_router)


# ===== AI ENDPOINTS =====
from app.ai_service import parse_natural_language_task, get_study_advice
from app.memory import get_preferences


@app.post("/api/ai/create-task")
def ai_create_task(request: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Create a task from natural language"""
    text = request.get('text', '')

    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    task_data = parse_natural_language_task(text)

    if 'error' in task_data:
        raise HTTPException(status_code=400, detail=task_data['error'])

    # Create the task with specific time if provided
    from datetime import datetime
    due_time = task_data.get('due_time', '23:59')
    due_datetime_str = f"{task_data['due_date']}T{due_time}:00"

    db_task = Task(
        user_id=user_id,
        title=task_data['title'],
        course=task_data.get('course'),
        due_date=datetime.fromisoformat(due_datetime_str),
        estimated_minutes=task_data['estimated_minutes'],
        priority=task_data['priority']
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    return {
        "success": True,
        "task": {
            "id": db_task.id,
            "title": db_task.title,
            "course": db_task.course,
            "due_date": db_task.due_date.isoformat(),
            "estimated_minutes": db_task.estimated_minutes,
            "priority": db_task.priority,
            "status": db_task.status
        },
        "message": f"✅ Created task: {task_data['title']}"
    }


@app.post("/api/ai/ask")
def ai_ask(request: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Ask AI for study advice"""
    question = request.get('question', '')

    if not question:
        raise HTTPException(status_code=400, detail="No question provided")

    prefs = get_preferences(db, user_id)
    answer = get_study_advice(question, prefs)

    return {
        "question": question,
        "answer": answer,
        "preferences_used": prefs
    }


@app.get("/api/preferences")
def get_user_preferences(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get learned user preferences from check-ins"""
    return get_preferences(db, user_id)


@app.post("/api/ai/chat")
def ai_conversational_chat(request: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Smart conversational AI that extracts tasks and gives advice."""
    message = request.get('message', '')

    if not message:
        raise HTTPException(status_code=400, detail="No message provided")

    try:
        from app.ai_service import conversational_task_extraction
        from datetime import datetime, timedelta

        result = conversational_task_extraction(message, db)

        print("=" * 50)
        print("DEBUG: Full AI Result:")
        print(result)
        print("=" * 50)

        if 'error' in result:
            print(f"ERROR in AI response: {result['error']}")
            return {
                "ai_response": "Sorry, I had trouble understanding that. Could you rephrase?",
                "recommendations": [],
                "tasks_created": [],
                "tone_detected": "neutral",
                "tasks_found": 0
            }

        # Auto-create high-confidence tasks
        created_tasks = []

        tasks_found = result.get('tasks_found', [])
        print(f"DEBUG: Found {len(tasks_found)} tasks")

        for task_data in tasks_found:
            print(f"DEBUG: Processing task: {task_data}")

            if task_data.get('confidence', 0) > 0.7:
                try:
                    # Handle missing dates
                    due_date = task_data.get('due_date')
                    due_time = task_data.get('due_time', '23:59')

                    if not due_date or due_date == 'None' or due_date is None:
                        default_date = datetime.now() + timedelta(days=7)
                        due_date = default_date.strftime('%Y-%m-%d')

                    if not due_time or due_time == 'None' or due_time is None:
                        due_time = '23:59'

                    due_datetime_str = f"{due_date}T{due_time}:00"

                    db_task = Task(
                        user_id=user_id,
                        title=task_data.get('title', 'Untitled Task'),
                        course=task_data.get('course'),
                        due_date=datetime.fromisoformat(due_datetime_str),
                        estimated_minutes=task_data.get('estimated_minutes', 60),
                        priority=task_data.get('priority', 3)
                    )
                    db.add(db_task)
                    db.commit()
                    db.refresh(db_task)
                    created_tasks.append(db_task.title)
                    print(f"DEBUG: Successfully created task: {db_task.title}")
                except Exception as e:
                    print(f"ERROR creating task: {e}")
                    print(f"Task data was: {task_data}")

        return {
            "ai_response": result.get('ai_response', 'Tasks processed'),
            "recommendations": result.get('recommendations', []),
            "tasks_created": created_tasks,
            "tone_detected": result.get('tone_detected', 'neutral'),
            "tasks_found": len(tasks_found)
        }

    except Exception as e:
        print(f"FATAL ERROR in ai_chat endpoint: {e}")
        import traceback
        traceback.print_exc()
        return {
            "ai_response": "Sorry, something went wrong. Please try again.",
            "recommendations": [],
            "tasks_created": [],
            "tone_detected": "neutral",
            "tasks_found": 0
        }


@app.post("/api/ai/analyze-checkin")
def ai_analyze_checkin_endpoint(request: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """
    Analyze check-in notes and suggest tasks.
    """
    notes = request.get('notes', '')
    energy_level = request.get('energy_level', 3)
    completed_tasks = request.get('completed_tasks', '')

    from app.ai_service import analyze_checkin_for_tasks
    result = analyze_checkin_for_tasks(notes, energy_level, completed_tasks)

    if 'error' in result:
        raise HTTPException(status_code=400, detail=result['error'])

    return result


@app.post("/api/syllabus/upload")
async def upload_syllabus(
        file: UploadFile = File(...),
        course_code: str = None,
        db: Session = Depends(get_db),
        user_id: str = Depends(get_current_user_id)
):
    """Upload and parse a syllabus PDF"""

    if not course_code:
        raise HTTPException(status_code=400, detail="Course code required")

    # Save uploaded file temporarily using a safe random name (not user-supplied filename)
    import tempfile
    temp_dir = tempfile.gettempdir()
    original_ext = os.path.splitext(file.filename)[1].lower() if file.filename else '.pdf'
    temp_path = os.path.join(temp_dir, f"{uuid.uuid4()}{original_ext}")

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        from app.syllabus_parser import parse_syllabus_pdf
        from datetime import datetime

        result = parse_syllabus_pdf(temp_path, course_code.upper(), db)

        # ADD THIS DEBUG BLOCK
        print("=" * 50)
        print("DEBUG: Syllabus parse result:")
        print(f"Type: {type(result)}")
        print(f"Content: {result}")
        print("=" * 50)

        if 'error' in result:
            print(f"ERROR in result: {result['error']}")
            raise HTTPException(status_code=400, detail=result['error'])

        # Create tasks from extracted data
        created_tasks = []

        tasks_list = result.get('tasks', [])
        print(f"DEBUG: Found {len(tasks_list)} tasks to create")

        for task_data in tasks_list:
            print(f"DEBUG: Creating task: {task_data.get('title')}")
            try:
                due_date = task_data['due_date']
                due_time = task_data.get('due_time', '23:59')
                due_datetime_str = f"{due_date}T{due_time}:00"

                db_task = Task(
                    user_id=user_id,
                    title=task_data['title'],
                    course=course_code.upper(),
                    due_date=datetime.fromisoformat(due_datetime_str),
                    estimated_minutes=task_data.get('estimated_minutes', 90),
                    priority=task_data.get('priority', 3)
                )
                db.add(db_task)
                created_tasks.append(task_data['title'])
                print(f"DEBUG: Successfully queued task: {task_data['title']}")
            except Exception as e:
                print(f"ERROR creating task from syllabus: {e}")
                print(f"Task data was: {task_data}")

        db.commit()
        print(f"DEBUG: Committed {len(created_tasks)} tasks to database")

        # Clean up temp file
        os.remove(temp_path)

        return {
            "success": True,
            "tasks_created": len(created_tasks),
            "tasks": created_tasks,
            "course_info": result.get('course_info', {})
        }

    except Exception as e:
        print(f"FATAL ERROR in upload_syllabus: {e}")
        import traceback
        traceback.print_exc()
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/plan/smart")
def get_smart_plan(request: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Generate multi-day smart plan"""
    from app.planner import generate_smart_plan
    from app.memory import get_preferences

    days = request.get('days', 7)
    prefs = get_preferences(db, user_id)

    plan = generate_smart_plan(db, days, prefs, user_id)
    return plan


@app.put("/api/tasks/{task_id}")
def update_task(task_id: int, task_update: TaskCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Update an existing task"""
    task = db.query(Task).filter(Task.id == task_id, Task.user_id == user_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields
    task.title = task_update.title
    task.course = task_update.course
    task.due_date = task_update.due_date
    task.estimated_minutes = task_update.estimated_minutes
    task.priority = task_update.priority

    db.commit()
    db.refresh(task)
    return task


@app.get("/api/export/ical")
def export_ical(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from fastapi.responses import Response
    tasks_list = db.query(Task).filter(Task.user_id == user_id, Task.status != 'done').all()
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Study Planner//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]
    for t in tasks_list:
        due = t.due_date.strftime("%Y%m%dT%H%M%SZ")
        stamp = (t.created_at or t.due_date).strftime("%Y%m%dT%H%M%SZ")
        summary = t.title.replace(",", "\\,").replace(";", "\\;")
        desc = f"Course: {t.course or 'N/A'} | Priority: {t.priority}/5 | Est: {t.estimated_minutes}min"
        lines += ["BEGIN:VEVENT", f"UID:task-{t.id}@study-planner", f"DTSTAMP:{stamp}",
                  f"DTSTART:{due}", f"DTEND:{due}", f"SUMMARY:{summary}", f"DESCRIPTION:{desc}", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return Response("\r\n".join(lines) + "\r\n", media_type="text/calendar",
                    headers={"Content-Disposition": "attachment; filename=study-planner.ics"})


# ===== GRADES ROUTER =====
grades_router = APIRouter(prefix="/api/grades", tags=["grades"])


@grades_router.get("/summary")
def grade_summary(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.models import GradeItem
    items = db.query(GradeItem).filter(GradeItem.user_id == user_id, GradeItem.grade != None).all()
    summary = {}
    for it in items:
        s = summary.setdefault(it.course, {'ws': 0, 'wt': 0})
        s['ws'] += it.grade * it.weight
        s['wt'] += it.weight
    return [{'course': c, 'weighted_average': round(v['ws'] / v['wt'], 1) if v['wt'] else None} for c, v in summary.items()]


@grades_router.get("/")
def get_grades(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.models import GradeItem
    return db.query(GradeItem).filter(GradeItem.user_id == user_id).order_by(GradeItem.course, GradeItem.created_at).all()


@grades_router.post("/")
def create_grade(data: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.models import GradeItem
    item = GradeItem(user_id=user_id, course=data['course'], title=data['title'],
                     grade=data.get('grade'), weight=float(data['weight']))
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@grades_router.put("/{gid}")
def update_grade(gid: int, data: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.models import GradeItem
    item = db.query(GradeItem).filter(GradeItem.id == gid, GradeItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    for k in ('grade', 'weight', 'title'):
        if k in data:
            setattr(item, k, data[k])
    db.commit()
    db.refresh(item)
    return item


@grades_router.delete("/{gid}")
def delete_grade(gid: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.models import GradeItem
    item = db.query(GradeItem).filter(GradeItem.id == gid, GradeItem.user_id == user_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


app.include_router(grades_router)


# ===== RECURRING ROUTER =====
recurring_router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@recurring_router.get("/")
def get_recurring(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.models import RecurringTask
    return db.query(RecurringTask).filter(RecurringTask.user_id == user_id).all()


@recurring_router.post("/")
def create_recurring(data: dict, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.models import RecurringTask
    rt = RecurringTask(user_id=user_id, **{k: v for k, v in data.items() if k != 'user_id'})
    db.add(rt)
    db.commit()
    db.refresh(rt)
    return rt


@recurring_router.post("/expand")
def expand_recurring(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.recurring import expand_recurring_tasks
    created = expand_recurring_tasks(db, user_id)
    return {"created": len(created), "tasks": created}


@recurring_router.delete("/{rt_id}")
def delete_recurring(rt_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    from app.models import RecurringTask
    rt = db.query(RecurringTask).filter(RecurringTask.id == rt_id, RecurringTask.user_id == user_id).first()
    if not rt:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(rt)
    db.commit()
    return {"ok": True}


app.include_router(recurring_router)

