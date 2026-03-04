from datetime import date, timedelta, datetime
from sqlalchemy.orm import Session
from app.models import RecurringTask, Task, TermConfig

DAY_MAP = {"Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6}


def expand_recurring_tasks(db: Session, user_id: str) -> list:
    term = db.query(TermConfig).filter(TermConfig.user_id == user_id, TermConfig.is_active == 1).first()
    end_boundary = term.end_date if term else (date.today() + timedelta(days=90))
    recurring = db.query(RecurringTask).filter(RecurringTask.user_id == user_id).all()
    created = []
    today = date.today()
    for rt in recurring:
        if rt.frequency != "weekly" or rt.day_of_week not in DAY_MAP:
            continue
        target_weekday = DAY_MAP[rt.day_of_week]
        current = today
        while current <= end_boundary:
            if current.weekday() == target_weekday:
                due_time = rt.time or "12:00"
                due_dt = datetime.combine(current, datetime.strptime(due_time, "%H:%M").time())
                exists = db.query(Task).filter(
                    Task.user_id == user_id,
                    Task.title == rt.title,
                    Task.course == rt.course,
                    Task.due_date == due_dt
                ).first()
                if not exists:
                    db.add(Task(
                        user_id=user_id,
                        title=rt.title,
                        course=rt.course,
                        due_date=due_dt,
                        estimated_minutes=rt.estimated_minutes,
                        priority=rt.priority
                    ))
                    created.append({"title": rt.title, "date": str(current)})
            current += timedelta(days=1)
    db.commit()
    return created
