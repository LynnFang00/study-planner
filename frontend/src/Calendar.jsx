import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './Calendar.css';

function Calendar({ tasks, courses, onTaskClick, onTaskReschedule }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [dragOverDate, setDragOverDate] = useState(null);

  const getCourseColor = (courseCode) => {
    const course = courses.find(c => c.code === courseCode);
    return course?.color || '#667eea';
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter(task => {
      const taskDate = new Date(task.due_date).toISOString().split('T')[0];
      return taskDate === dateStr;
    });
  };

  const toDateStr = (date) => date.toISOString().split('T')[0];

  // Navigation functions
  const goToToday = () => setCurrentDate(new Date());

  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setDate(newDate.getDate() - 7);
    }
    setCurrentDate(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  // Drag handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', String(taskId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, dateStr) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateStr);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverDate(null);
    }
  };

  const handleDrop = (e, dateStr) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = parseInt(e.dataTransfer.getData('taskId'));
    if (taskId && onTaskReschedule) {
      onTaskReschedule(taskId, dateStr);
    }
  };

  // Month view rendering
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get days from previous month to fill the grid
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month's days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      days.push({ date, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }

    // Next month's days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows × 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="calendar-grid">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-header">{day}</div>
        ))}

        {/* Days */}
        {days.map((dayObj, idx) => {
          const dayTasks = getTasksForDate(dayObj.date);
          const isToday = dayObj.date.toDateString() === today.toDateString();
          const dateStr = toDateStr(dayObj.date);
          const isDragOver = dragOverDate === dateStr;

          return (
            <div
              key={idx}
              className={`calendar-day ${!dayObj.isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={e => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, dateStr)}
            >
              <div className="day-number">{dayObj.date.getDate()}</div>
              <div className="day-tasks">
                {dayTasks.slice(0, 3).map(task => (
                  <div
                    key={task.id}
                    className={`task-pill ${task.status}`}
                    draggable
                    onDragStart={e => handleDragStart(e, task.id)}
                    onClick={() => onTaskClick && onTaskClick(task)}
                    style={{
                      background: getCourseColor(task.course)
                    }}
                    title={`${task.title} - ${new Date(task.due_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`}
                  >
                    <span className="task-time">
                      {new Date(task.due_date).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </span>
                    <span className="task-title-short">{task.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="more-tasks">+{dayTasks.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Week view rendering
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
      <div className="week-view">
        <div className="week-grid">
          {days.map((date, idx) => {
            const dayTasks = getTasksForDate(date);
            const isToday = date.toDateString() === today.toDateString();
            const dateStr = toDateStr(date);
            const isDragOver = dragOverDate === dateStr;

            return (
              <div
                key={idx}
                className={`week-day ${isToday ? 'today' : ''} ${isDragOver ? 'drag-over' : ''}`}
                onDragOver={e => handleDragOver(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={e => handleDrop(e, dateStr)}
              >
                <div className="week-day-header">
                  <div className="week-day-name">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="week-day-number">{date.getDate()}</div>
                </div>
                <div className="week-day-tasks">
                  {dayTasks.length === 0 ? (
                    <div className="no-tasks">No tasks</div>
                  ) : (
                    dayTasks.map(task => (
                      <div
                        key={task.id}
                        className={`week-task ${task.status}`}
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                        onClick={() => onTaskClick && onTaskClick(task)}
                        style={{
                          background: getCourseColor(task.course)
                        }}
                      >
                        <div className="week-task-time">
                          {new Date(task.due_date).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </div>
                        <div className="week-task-title">{task.title}</div>
                        <div className="week-task-course">{task.course}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-container">
      {/* Calendar controls */}
      <div className="calendar-controls">
        <div className="calendar-nav">
          <button onClick={goToPrevious} className="nav-btn" aria-label="Previous"><FiChevronLeft size={18} /></button>
          <button onClick={goToToday} className="nav-btn today-btn">Today</button>
          <button onClick={goToNext} className="nav-btn" aria-label="Next"><FiChevronRight size={18} /></button>
        </div>

        <h2 className="calendar-title">
          {currentDate.toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
          })}
        </h2>

        <div className="view-toggle">
          <button
            className={view === 'month' ? 'active' : ''}
            onClick={() => setView('month')}
          >
            Month
          </button>
          <button
            className={view === 'week' ? 'active' : ''}
            onClick={() => setView('week')}
          >
            Week
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {view === 'month' ? renderMonthView() : renderWeekView()}
    </div>
  );
}

export default Calendar;
