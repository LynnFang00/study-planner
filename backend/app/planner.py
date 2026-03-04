from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models import Task, Event


def generate_tomorrow_plan(db: Session, user_id: str) -> Dict:
    """
    Generate a study plan for tomorrow based on:
    1. Available time blocks (gaps between events)
    2. Urgent tasks (due soon, high priority)
    3. Simple greedy scheduling - ONE TASK PER BLOCK
    """

    # Get tomorrow's date
    tomorrow = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    tomorrow_end = tomorrow + timedelta(days=1)
    day_name = tomorrow.strftime("%A")

    # Get tasks that need to be done
    urgent_tasks = db.query(Task).filter(
        Task.user_id == user_id,
        Task.status == "todo",
        Task.due_date <= tomorrow + timedelta(days=7)  # Due within a week
    ).order_by(Task.priority.desc(), Task.due_date).all()

    # Get tomorrow's scheduled events
    events = db.query(Event).filter(Event.day_of_week == day_name).all()

    # Convert events to time blocks
    busy_blocks = []
    for event in events:
        start_hour, start_min = map(int, event.start_time.split(':'))
        end_hour, end_min = map(int, event.end_time.split(':'))

        start_dt = tomorrow.replace(hour=start_hour, minute=start_min)
        end_dt = tomorrow.replace(hour=end_hour, minute=end_min)

        busy_blocks.append({
            'start': start_dt,
            'end': end_dt,
            'title': event.title,
            'type': 'event'
        })

    # Sort busy blocks by start time
    busy_blocks.sort(key=lambda x: x['start'])

    # Find ALL free time blocks (8am to 10pm)
    day_start = tomorrow.replace(hour=8, minute=0)
    day_end = tomorrow.replace(hour=22, minute=0)

    free_blocks = []
    current_time = day_start

    for busy_block in busy_blocks:
        # If there's a gap before this event
        if current_time < busy_block['start']:
            gap_minutes = (busy_block['start'] - current_time).total_seconds() / 60
            if gap_minutes >= 30:  # Only consider gaps of 30+ minutes
                free_blocks.append({
                    'start': current_time,
                    'end': busy_block['start'],
                    'minutes': int(gap_minutes)
                })
        current_time = max(current_time, busy_block['end'])

    # Add final block after last event
    if current_time < day_end:
        gap_minutes = (day_end - current_time).total_seconds() / 60
        if gap_minutes >= 30:
            free_blocks.append({
                'start': current_time,
                'end': day_end,
                'minutes': int(gap_minutes)
            })

    # Schedule tasks into free blocks - ONE TASK PER BLOCK
    scheduled_tasks = []
    task_index = 0

    for block in free_blocks:
        # Try to fit tasks in this block
        block_start = block['start']
        remaining_minutes = block['minutes']

        while task_index < len(urgent_tasks) and remaining_minutes >= 30:
            task = urgent_tasks[task_index]

            # Check if task fits in remaining time
            if task.estimated_minutes <= remaining_minutes:
                # Schedule this task
                task_start = block_start
                task_end = task_start + timedelta(minutes=task.estimated_minutes)

                scheduled_tasks.append({
                    'task_id': task.id,
                    'title': task.title,
                    'course': task.course,
                    'start_time': task_start.strftime('%H:%M'),
                    'end_time': task_end.strftime('%H:%M'),
                    'duration_minutes': task.estimated_minutes,
                    'priority': task.priority,
                    'due_date': task.due_date.isoformat(),
                    'reasoning': f"Scheduled in {block['minutes']}-minute gap. Priority: {task.priority}/5"
                })

                # Update for next task in this block
                block_start = task_end + timedelta(minutes=15)  # 15 min break
                remaining_minutes -= (task.estimated_minutes + 15)
                task_index += 1
            else:
                # Task too big for remaining time, move to next block
                break

    # Combine scheduled tasks and events into full timeline
    timeline = []

    # Add events
    for block in busy_blocks:
        timeline.append({
            'type': 'event',
            'title': block['title'],
            'start_time': block['start'].strftime('%H:%M'),
            'end_time': block['end'].strftime('%H:%M'),
        })

    # Add scheduled tasks as SEPARATE items
    for task in scheduled_tasks:
        timeline.append({
            'type': 'study',
            'title': task['title'],
            'course': task['course'],
            'start_time': task['start_time'],
            'end_time': task['end_time'],
            'duration_minutes': task['duration_minutes'],
            'reasoning': task['reasoning']
        })

    # Sort by start time
    timeline.sort(key=lambda x: x['start_time'])

    return {
        'date': tomorrow.strftime('%Y-%m-%d'),
        'day_of_week': day_name,
        'total_study_time': sum(t['duration_minutes'] for t in scheduled_tasks),
        'tasks_scheduled': len(scheduled_tasks),
        'tasks_pending': len(urgent_tasks) - len(scheduled_tasks),
        'timeline': timeline,
        'unscheduled_tasks': [
            {
                'task_id': task.id,
                'title': task.title,
                'estimated_minutes': task.estimated_minutes,
                'reason': 'Not enough free time in schedule'
            }
            for task in urgent_tasks
            if task.id not in [st['task_id'] for st in scheduled_tasks]
        ]
    }


def generate_smart_plan(db: Session, num_days: int, preferences: dict, user_id: str) -> Dict:
    """
    Generate a smart multi-day plan showing ALL tasks (past and future).
    """

    from datetime import datetime, timedelta

    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    # Get ALL tasks (not just todo) to show completed ones too
    all_tasks = db.query(Task).filter(Task.user_id == user_id).order_by(Task.due_date).all()

    # Calculate date range (show past 7 days + future days)
    if num_days == 7:
        start_date = today - timedelta(days=7)  # Show past week too
        end_date = today + timedelta(days=7)
    elif num_days == 30:
        start_date = today - timedelta(days=30)  # Show past month
        end_date = today + timedelta(days=30)
    else:
        start_date = today
        end_date = today + timedelta(days=num_days)

    # Group tasks by date
    tasks_by_date = {}
    for task in all_tasks:
        task_date = task.due_date.date()
        if start_date.date() <= task_date <= end_date.date():
            date_str = task_date.strftime('%Y-%m-%d')
            if date_str not in tasks_by_date:
                tasks_by_date[date_str] = []

            tasks_by_date[date_str].append({
                'title': task.title,
                'course': task.course,
                'start_time': task.due_date.strftime('%H:%M'),
                'end_time': (task.due_date + timedelta(minutes=task.estimated_minutes)).strftime('%H:%M'),
                'duration_minutes': task.estimated_minutes,
                'priority': task.priority,
                'status': task.status
            })

    # Generate daily plans for each day in range
    daily_plans = []
    current_date = start_date

    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        day_name = current_date.strftime("%A")

        day_tasks = tasks_by_date.get(date_str, [])

        daily_plans.append({
            'date': date_str,
            'day_of_week': day_name,
            'tasks': day_tasks,
            'total_minutes': sum(t['duration_minutes'] for t in day_tasks),
            'is_today': current_date.date() == today.date()
        })

        current_date += timedelta(days=1)

    return {
        'period': f'{num_days} days',
        'start_date': start_date.strftime('%Y-%m-%d'),
        'end_date': end_date.strftime('%Y-%m-%d'),
        'daily_plans': daily_plans,
        'total_tasks': len(all_tasks)
    }

