import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api, axiosInstance } from './api/client';
import './App.css';
import Calendar from './Calendar';
import PomodoroTimer from './PomodoroTimer';
import {
  FiPlus, FiHome, FiSettings, FiMessageSquare, FiEdit3, FiRefreshCw,
  FiBook, FiUpload, FiCalendar, FiClock, FiX, FiTrash2,
  FiEdit, FiCheck, FiAlertCircle, FiMove,
  FiDownload, FiRepeat, FiBarChart2, FiZap
} from 'react-icons/fi';

function App() {
  // ===== DATA STATE =====
  const [tasks, setTasks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [termConfig, setTermConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // ===== VIEW STATE =====
  const [activeView, setActiveView] = useState('home');
  const [showCoursePanel, setShowCoursePanel] = useState(false);

  // ===== MODAL VISIBILITY =====
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showSyllabusUpload, setShowSyllabusUpload] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // ===== REFS =====
  const userButtonRef = useRef(null);
  const signInRef = useRef(null);
  const notifTimeoutsRef = useRef([]);

  // ===== FILTER & BULK =====
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);

  // ===== FORM STATE =====
  const [newTask, setNewTask] = useState({
    title: '', course: '', due_date: '', estimated_minutes: 60, priority: 3
  });
  const [editForm, setEditForm] = useState({
    title: '', course: '', due_date: '', due_time: '', estimated_minutes: 60, priority: 3
  });
  const [checkIn, setCheckIn] = useState({
    energy_level: 3, notes: '', completed_tasks: ''
  });
  const [newCourse, setNewCourse] = useState({
    code: '', name: '', term: '', color: '#667eea'
  });
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [syllabusCourse, setSyllabusCourse] = useState('');
  const [syllabusText, setSyllabusText] = useState('');
  const [syllabusMode, setSyllabusMode] = useState('file');
  const [termForm, setTermForm] = useState({
    term_name: '', start_date: '', end_date: '',
    reading_week_start: '', reading_week_end: '',
    exam_period_start: '', exam_period_end: ''
  });
  const [addingScheduleFor, setAddingScheduleFor] = useState(null);
  const [newSchedule, setNewSchedule] = useState({
    class_type: 'lecture', day_of_week: 0, start_time: '', end_time: '', location: ''
  });
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseForm, setEditCourseForm] = useState({ name: '', term: '', color: '#667eea' });

  // ===== AI STATE =====
  const [aiInput, setAiInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // ===== FEATURE STATE =====
  const [streak, setStreak] = useState(0);
  const [grades, setGrades] = useState([]);
  const [gradeSummary, setGradeSummary] = useState([]);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [taskSort, setTaskSort] = useState('time');
  const [pomodoroTask, setPomodoroTask] = useState(null);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [newRecurring, setNewRecurring] = useState({
    title: '', course: '', frequency: 'weekly', day_of_week: 'Monday', time: '12:00', estimated_minutes: 60, priority: 3
  });

  // ===== UI FEEDBACK STATE =====
  const [toasts, setToasts] = useState([]);
  const [actionLoading, setActionLoading] = useState(null);

  // ===== AUTH =====
  const [clerkLoaded, setClerkLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(undefined);

  const courseColors = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe',
    '#43e97b', '#fa709a', '#fee140', '#30cfd0',
    '#a8edea', '#fed6e3', '#c471f5', '#fa8bff'
  ];

  // Load Clerk
  useEffect(() => {
    const pk = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
    if (!pk) { console.error('REACT_APP_CLERK_PUBLISHABLE_KEY is not set'); return; }
    const script = document.createElement('script');
    script.setAttribute('data-clerk-publishable-key', pk);
    script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
    script.onload = async () => {
      await window.Clerk.load();
      setIsSignedIn(!!window.Clerk.session);
      window.Clerk.addListener(({ session }) => setIsSignedIn(!!session));
      setClerkLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // JWT interceptor
  useEffect(() => {
    const id = axiosInstance.interceptors.request.use(async (config) => {
      if (window.Clerk?.session) {
        const token = await window.Clerk.session.getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    return () => axiosInstance.interceptors.request.eject(id);
  }, []);

  // Mount UserButton
  useEffect(() => {
    if (clerkLoaded && isSignedIn && userButtonRef.current) {
      window.Clerk.mountUserButton(userButtonRef.current, { afterSignOutUrl: '/' });
    }
  }, [clerkLoaded, isSignedIn]);

  // Mount SignIn
  useEffect(() => {
    if (clerkLoaded && isSignedIn === false && signInRef.current) {
      window.Clerk.mountSignIn(signInRef.current);
    }
  }, [clerkLoaded, isSignedIn]);

  // Browser notifications
  useEffect(() => {
    if (!('Notification' in window)) return;
    notifTimeoutsRef.current.forEach(clearTimeout);
    notifTimeoutsRef.current = [];
    if (Notification.permission === 'default') Notification.requestPermission();
    if (Notification.permission !== 'granted') return;
    const now = Date.now();
    tasks.forEach(task => {
      if (task.status === 'done') return;
      const ms = new Date(task.due_date).getTime() - 24 * 60 * 60 * 1000 - now;
      if (ms > 0 && ms < 48 * 60 * 60 * 1000) {
        const id = setTimeout(() => new Notification(`Due Tomorrow: ${task.title}`, {
          body: task.course || '', tag: `task-${task.id}`
        }), ms);
        notifTimeoutsRef.current.push(id);
      }
    });
    return () => notifTimeoutsRef.current.forEach(clearTimeout);
  }, [tasks]);

  // Load data
  useEffect(() => {
    if (isSignedIn === undefined) return;
    if (isSignedIn) loadData();
    else setLoading(false);
  }, [isSignedIn]);

  const loadData = async () => {
    try {
      const [tasksRes, coursesRes, schedulesRes] = await Promise.all([
        api.getTasks(), api.getCourses(), api.getSchedules()
      ]);
      setTasks(tasksRes.data);
      setCourses(coursesRes.data);
      setSchedules(schedulesRes.data);
      try {
        const termRes = await api.getActiveTerm();
        setTermConfig(termRes.data);
        setTermForm({
          term_name: termRes.data.term_name,
          start_date: termRes.data.start_date,
          end_date: termRes.data.end_date,
          reading_week_start: termRes.data.reading_week_start || '',
          reading_week_end: termRes.data.reading_week_end || '',
          exam_period_start: termRes.data.exam_period_start || '',
          exam_period_end: termRes.data.exam_period_end || ''
        });
      } catch {}
      try { const r = await api.getStreak(); setStreak(r.data.streak); } catch {}
      try {
        const [gradesRes, summaryRes, recurringRes] = await Promise.all([
          api.getGrades(), api.getGradeSummary(), api.getRecurring()
        ]);
        setGrades(gradesRes.data);
        setGradeSummary(summaryRes.data);
        setRecurringTasks(recurringRes.data);
      } catch {}
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== COMPUTED =====
  const getCourseColor = (courseCode) => {
    const course = courses.find(c => c.code === courseCode);
    return course?.color || '#667eea';
  };

  const filteredTasks = useMemo(() => {
    if (selectedCourses.length === 0) return tasks;
    return tasks.filter(t => selectedCourses.includes(t.course));
  }, [tasks, selectedCourses]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekFromNow = new Date(today); weekFromNow.setDate(today.getDate() + 7);
    const overdue = tasks.filter(t => {
      const d = new Date(t.due_date); d.setHours(0, 0, 0, 0);
      return d < today && t.status !== 'done';
    }).length;
    const dueThisWeek = tasks.filter(t => {
      const d = new Date(t.due_date);
      return d >= today && d <= weekFromNow && t.status !== 'done';
    }).length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { overdue, dueThisWeek, completed, completionRate };
  }, [tasks]);

  const courseTaskCounts = useMemo(() => {
    return courses.map(course => ({
      ...course,
      taskCount: tasks.filter(t => t.course === course.code && t.status !== 'done').length
    }));
  }, [courses, tasks]);

  const weeklyHours = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
    const mins = tasks.filter(t => {
      const d = new Date(t.due_date);
      return d >= today && d <= weekEnd && t.status !== 'done';
    }).reduce((s, t) => s + (t.estimated_minutes || 0), 0);
    return { hours: Math.floor(mins / 60), minutes: mins % 60 };
  }, [tasks]);

  const groupedTasks = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
    const pending = filteredTasks.filter(t => t.status !== 'done');
    const groups = { overdue: [], today: [], thisWeek: [], later: [] };
    pending.forEach(task => {
      const d = new Date(task.due_date); d.setHours(0, 0, 0, 0);
      if (d < today) groups.overdue.push(task);
      else if (d.getTime() === today.getTime()) groups.today.push(task);
      else if (d <= weekEnd) groups.thisWeek.push(task);
      else groups.later.push(task);
    });
    return groups;
  }, [filteredTasks]);

  const tasksByCourse = useMemo(() => {
    const pending = filteredTasks.filter(t => t.status !== 'done');
    const groups = {};
    pending.forEach(task => {
      const key = task.course || 'No Course';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredTasks]);

  const formatDueDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date); dateOnly.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((dateOnly - today) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < -1) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDueDateClass = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date < today) return 'overdue';
    const diffDays = Math.floor((date - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 3) return 'soon';
    return '';
  };

  const getDayName = (dayNum) =>
    ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayNum];

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // ===== TASK HANDLERS =====
  const handleAddTask = async (e) => {
    e.preventDefault();
    setActionLoading('addTask');
    try {
      await api.createTask({ ...newTask, due_date: new Date(newTask.due_date).toISOString() });
      setNewTask({ title: '', course: '', due_date: '', estimated_minutes: 60, priority: 3 });
      setShowAddTask(false);
      showToast('Task created!');
      loadData();
    } catch { showToast('Failed to create task', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleEditTask = (task) => {
    const dueDate = new Date(task.due_date);
    setEditForm({
      title: task.title, course: task.course || '',
      due_date: dueDate.toISOString().split('T')[0],
      due_time: dueDate.toTimeString().slice(0, 5),
      estimated_minutes: task.estimated_minutes, priority: task.priority
    });
    setEditingTask(task);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    setActionLoading('updateTask');
    try {
      await api.updateTask(editingTask.id, { ...editForm, due_date: `${editForm.due_date}T${editForm.due_time}:00` });
      setEditingTask(null);
      showToast('Task updated!');
      loadData();
    } catch { showToast('Failed to update task', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try { await api.deleteTask(id); showToast('Task deleted'); loadData(); }
    catch { showToast('Failed to delete task', 'error'); }
  };

  const handleToggleStatus = async (task) => {
    const newStatus = task.status === 'todo' ? 'done' : 'todo';
    try { await api.updateTaskStatus(task.id, newStatus); loadData(); }
    catch (error) { console.error('Error updating task:', error); }
  };

  // ===== FILTER & BULK =====
  const toggleCourseFilter = (courseCode) => {
    setSelectedCourses(prev =>
      prev.includes(courseCode) ? prev.filter(c => c !== courseCode) : [...prev, courseCode]
    );
  };

  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkMarkDone = async () => {
    if (selectedTasks.length === 0) return;
    const count = selectedTasks.length;
    try {
      const tasksToUpdate = tasks.filter(t => selectedTasks.includes(t.id));
      await Promise.all(tasksToUpdate.map(task =>
        api.updateTask(task.id, { ...task, status: 'completed' })
      ));
      setSelectedTasks([]); setBulkMode(false);
      showToast(`${count} tasks marked as done`); loadData();
    } catch { showToast('Failed to update some tasks', 'error'); }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!window.confirm(`Delete ${selectedTasks.length} selected tasks?`)) return;
    const count = selectedTasks.length;
    try {
      await Promise.all(selectedTasks.map(id => api.deleteTask(id)));
      setSelectedTasks([]); setBulkMode(false);
      showToast(`${count} tasks deleted`); loadData();
    } catch { showToast('Failed to delete some tasks', 'error'); }
  };

  const handleBulkMove = async () => {
    if (selectedTasks.length === 0) return;
    const daysToMove = prompt(`Move ${selectedTasks.length} tasks by how many days?`);
    if (!daysToMove) return;
    const days = parseInt(daysToMove);
    if (isNaN(days)) { showToast('Please enter a valid number', 'error'); return; }
    const count = selectedTasks.length;
    try {
      const tasksToUpdate = tasks.filter(t => selectedTasks.includes(t.id));
      await Promise.all(tasksToUpdate.map(task => {
        const newDate = new Date(task.due_date);
        newDate.setDate(newDate.getDate() + days);
        return api.updateTask(task.id, {
          title: task.title, course: task.course,
          due_date: newDate.toISOString(),
          estimated_minutes: task.estimated_minutes, priority: task.priority
        });
      }));
      setSelectedTasks([]); setBulkMode(false);
      showToast(`${count} tasks moved by ${days} day${Math.abs(days) !== 1 ? 's' : ''}`);
      loadData();
    } catch { showToast('Failed to move some tasks', 'error'); }
  };

  // ===== CHECKIN =====
  const handleCheckIn = async (e) => {
    e.preventDefault();
    setActionLoading('checkIn');
    try {
      await api.createCheckIn(checkIn);
      setCheckIn({ energy_level: 3, notes: '', completed_tasks: '' });
      setShowCheckIn(false);
      showToast('Check-in saved!');
    } catch { showToast('Failed to save check-in', 'error'); }
    finally { setActionLoading(null); }
  };

  // ===== AI =====
  const handleAiCreateTask = async (e) => {
    e.preventDefault();
    if (!aiInput.trim()) return;
    setActionLoading('aiCreate');
    try {
      const response = await api.aiCreateTask(aiInput);
      setAiInput('');
      showToast(response.data.message || 'Task created from AI!');
      loadData();
    } catch { showToast('Failed to create task from AI', 'error'); }
    finally { setActionLoading(null); }
  };

  const handleAiChat = async (question) => {
    if (!question.trim()) return;
    setChatMessages(prev => [...prev, { role: 'user', content: question }]);
    setChatLoading(true);
    try {
      const response = await api.aiChat(question);
      let aiMessage = response.data.ai_response;
      if (response.data.tasks_created?.length > 0)
        aiMessage += `\n\nCreated tasks:\n${response.data.tasks_created.map(t => `• ${t}`).join('\n')}`;
      if (response.data.recommendations?.length > 0)
        aiMessage += `\n\nRecommendations:\n${response.data.recommendations.map(r => `• ${r}`).join('\n')}`;
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiMessage }]);
      if (response.data.tasks_created?.length > 0) {
        showToast(`${response.data.tasks_created.length} task(s) created!`); loadData();
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
    } finally { setChatLoading(false); }
  };

  // ===== SCHEDULE =====
  const handleAddSchedule = async (e, courseId) => {
    e.preventDefault();
    try {
      await api.createSchedule({ course_id: courseId, ...newSchedule });
      setNewSchedule({ class_type: 'lecture', day_of_week: 0, start_time: '', end_time: '', location: '' });
      setAddingScheduleFor(null); loadData();
    } catch { alert('Failed to create schedule'); }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Delete this class schedule?')) return;
    try { await api.deleteSchedule(scheduleId); loadData(); }
    catch (error) { console.error('Error deleting schedule:', error); }
  };

  // ===== DRAG & DROP =====
  const handleTaskReschedule = async (taskId, newDateStr) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const time = new Date(task.due_date).toTimeString().slice(0, 5);
    try {
      await api.updateTask(taskId, { ...task, due_date: `${newDateStr}T${time}:00` });
      showToast('Task moved!'); loadData();
    } catch { showToast('Failed to move task', 'error'); }
  };

  // ===== ICAL =====
  const handleExportIcal = async () => {
    try {
      const r = await api.exportIcal();
      const url = URL.createObjectURL(new Blob([r.data], { type: 'text/calendar' }));
      Object.assign(document.createElement('a'), { href: url, download: 'study-planner.ics' }).click();
      URL.revokeObjectURL(url);
      showToast('Calendar exported!');
    } catch { showToast('Export failed', 'error'); }
  };

  // ===== TERM =====
  const handleSaveTermConfig = async (e) => {
    e.preventDefault();
    try {
      await api.createOrUpdateTerm(termForm);
      showToast('Term settings saved!'); loadData();
    } catch { alert('Failed to save term configuration'); }
  };

  // ===== EARLY RETURNS =====
  if (isSignedIn === undefined) {
    return (
      <div className="App">
        <div className="loading">
          <FiRefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="auth-screen">
        <h1>Study Planner</h1>
        <div ref={signInRef} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <FiRefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p>Loading your study planner...</p>
        </div>
      </div>
    );
  }

  // ===== RENDER HELPERS =====
  const renderTaskRow = (task) => (
    <div key={task.id} className={`task-row ${task.status} ${selectedTasks.includes(task.id) ? 'selected' : ''}`}>
      <div className="task-row-check">
        {bulkMode ? (
          <input type="checkbox" checked={selectedTasks.includes(task.id)} onChange={() => toggleTaskSelection(task.id)} />
        ) : (
          <button
            className={`check-btn ${task.status === 'done' ? 'checked' : ''}`}
            onClick={() => handleToggleStatus(task)}
          >
            {task.status === 'done' && <FiCheck size={11} />}
          </button>
        )}
      </div>
      <div className="task-row-color" style={{ background: getCourseColor(task.course) }} />
      <div className="task-row-body">
        <span className="task-row-title">{task.title}</span>
        <div className="task-row-meta">
          {task.course && <span className="task-row-course" style={{ color: getCourseColor(task.course) }}>{task.course}</span>}
          <span className={`due-badge due-badge--${getDueDateClass(task.due_date) || 'normal'}`}>{formatDueDate(task.due_date)}</span>
          <span className="task-row-est"><FiClock size={11} /> {task.estimated_minutes}m</span>
        </div>
      </div>
      <div className="task-row-actions">
        <button className="btn-icon" title="Focus" onClick={() => { setPomodoroTask(task); setShowPomodoro(true); }}><FiClock size={14} /></button>
        <button className="btn-icon" onClick={() => handleEditTask(task)}><FiEdit size={14} /></button>
        <button className="btn-icon" onClick={() => handleDeleteTask(task.id)}><FiTrash2 size={14} /></button>
      </div>
    </div>
  );

  const renderHomeView = () => (
    <div className="view-content">
      <div className="view-header">
        <div>
          <h1 className="view-title">My Tasks</h1>
          <p className="view-subtitle">
            {stats.dueThisWeek} due this week · {weeklyHours.hours}h{weeklyHours.minutes > 0 ? ` ${weeklyHours.minutes}m` : ''} estimated
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowCheckIn(true)}>
            <FiEdit3 size={14} /> Check-in
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => { setBulkMode(!bulkMode); setSelectedTasks([]); }}
            style={bulkMode ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : {}}
          >
            {bulkMode ? 'Cancel' : 'Select'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddTask(true)}>
            <FiPlus size={15} /> Add Task
          </button>
        </div>
      </div>

      {/* Course filter chips */}
      <div className="course-chips">
        <button
          className={`course-chip ${selectedCourses.length === 0 ? 'active' : ''}`}
          onClick={() => setSelectedCourses([])}
        >
          All
        </button>
        {courses.map(c => (
          <button
            key={c.id}
            className={`course-chip ${selectedCourses.includes(c.code) ? 'active' : ''}`}
            style={selectedCourses.includes(c.code) ? { background: c.color, borderColor: c.color, color: 'white' } : {}}
            onClick={() => toggleCourseFilter(c.code)}
          >
            <span className="course-chip-dot" style={{ background: selectedCourses.includes(c.code) ? 'rgba(255,255,255,0.7)' : c.color }} />
            {c.code}
          </button>
        ))}
      </div>

      {/* Bulk bar */}
      {bulkMode && (
        <div className="bulk-bar">
          <span className="bulk-bar-count">{selectedTasks.length} selected</span>
          <button className="btn btn-sm btn-secondary" onClick={() => setSelectedTasks(filteredTasks.map(t => t.id))}>All</button>
          {selectedTasks.length > 0 && (
            <>
              <button className="btn btn-sm btn-secondary" onClick={handleBulkMarkDone}><FiCheck size={13} /> Done</button>
              <button className="btn btn-sm btn-secondary" onClick={handleBulkMove}><FiMove size={13} /> Move</button>
              <button className="btn btn-sm btn-danger" onClick={handleBulkDelete}><FiTrash2 size={13} /> Delete</button>
            </>
          )}
        </div>
      )}

      {/* Sort toggle */}
      <div className="sort-toggle">
        <button className={`sort-toggle-btn ${taskSort === 'time' ? 'active' : ''}`} onClick={() => setTaskSort('time')}>By Time</button>
        <button className={`sort-toggle-btn ${taskSort === 'course' ? 'active' : ''}`} onClick={() => setTaskSort('course')}>By Course</button>
      </div>

      {/* Task groups */}
      {taskSort === 'time' ? (
        <>
          {groupedTasks.overdue.length > 0 && (
            <div className="task-group">
              <div className="task-group-label overdue">Overdue <span className="task-group-count">{groupedTasks.overdue.length}</span></div>
              {groupedTasks.overdue.map(renderTaskRow)}
            </div>
          )}
          {groupedTasks.today.length > 0 && (
            <div className="task-group">
              <div className="task-group-label">Today <span className="task-group-count">{groupedTasks.today.length}</span></div>
              {groupedTasks.today.map(renderTaskRow)}
            </div>
          )}
          {groupedTasks.thisWeek.length > 0 && (
            <div className="task-group">
              <div className="task-group-label">This Week <span className="task-group-count">{groupedTasks.thisWeek.length}</span></div>
              {groupedTasks.thisWeek.map(renderTaskRow)}
            </div>
          )}
          {groupedTasks.later.length > 0 && (
            <div className="task-group">
              <div className="task-group-label">Later <span className="task-group-count">{groupedTasks.later.length}</span></div>
              {groupedTasks.later.map(renderTaskRow)}
            </div>
          )}
        </>
      ) : (
        <>
          {tasksByCourse.map(([courseCode, courseTasks]) => (
            <div key={courseCode} className="task-group">
              <div className="task-group-label" style={{ color: getCourseColor(courseCode) }}>
                {courseCode} <span className="task-group-count">{courseTasks.length}</span>
              </div>
              {courseTasks.map(renderTaskRow)}
            </div>
          ))}
        </>
      )}
      {(taskSort === 'time' ? Object.values(groupedTasks).every(g => g.length === 0) : tasksByCourse.length === 0) && (
        <div className="empty-state">
          <FiCalendar size={40} style={{ opacity: 0.25, marginBottom: '16px' }} />
          <h3>All caught up</h3>
          <p>No pending tasks. Add one to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowAddTask(true)}><FiPlus /> Add Task</button>
        </div>
      )}
    </div>
  );

  const renderCalendarView = () => (
    <div className="view-content view-content--wide">
      <div className="view-header">
        <h1 className="view-title">Calendar</h1>
        <button className="btn btn-sm btn-secondary" onClick={handleExportIcal}><FiDownload size={14} /> Export iCal</button>
      </div>
      <Calendar tasks={tasks} courses={courses} onTaskClick={handleEditTask} onTaskReschedule={handleTaskReschedule} />
    </div>
  );

  const renderGradesView = () => (
    <div className="view-content">
      <div className="view-header">
        <h1 className="view-title">Grades</h1>
        <button className="btn btn-primary btn-sm" type="submit" form="grade-form-inline"><FiPlus size={14} /> Add Item</button>
      </div>

      {/* Summary chips */}
      {gradeSummary.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '24px' }}>
          {gradeSummary.map(s => (
            <div key={s.course} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 16px', borderRadius: 'var(--radius-full)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
              <span style={{ fontWeight: '700', color: getCourseColor(s.course), fontSize: '13px' }}>{s.course}</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: s.weighted_average >= 80 ? 'var(--secondary)' : s.weighted_average >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
                {s.weighted_average !== null ? `${s.weighted_average}%` : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {grades.length > 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div className="section-label">Items</div>
          <table className="grade-table">
            <thead>
              <tr><th>Course</th><th>Item</th><th>Grade</th><th>Weight</th><th></th></tr>
            </thead>
            <tbody>
              {grades.map(item => (
                <tr key={item.id}>
                  <td><span style={{ color: getCourseColor(item.course), fontWeight: '600' }}>{item.course}</span></td>
                  <td>{item.title}</td>
                  <td>
                    <span className={`grade-badge ${!item.grade ? '' : item.grade >= 80 ? 'grade-A' : item.grade >= 70 ? 'grade-B' : item.grade >= 60 ? 'grade-C' : 'grade-D'}`}>
                      {item.grade !== null ? `${item.grade}%` : '—'}
                    </span>
                  </td>
                  <td>{item.weight}%</td>
                  <td>
                    <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={async () => {
                      await api.deleteGrade(item.id); showToast('Deleted'); loadData();
                    }}><FiTrash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add form */}
      <div className="section-label">Add Grade Item</div>
      <form id="grade-form-inline" onSubmit={async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        await api.createGrade({
          course: fd.get('course'), title: fd.get('title'),
          grade: fd.get('grade') ? parseFloat(fd.get('grade')) : null,
          weight: parseFloat(fd.get('weight'))
        });
        e.target.reset(); showToast('Added!'); loadData();
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr', gap: '8px' }}>
          <select name="course" className="form-select" required style={{ fontSize: '13px' }}>
            <option value="">Course</option>
            {courses.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
          </select>
          <input name="title" className="form-input" type="text" placeholder="e.g., Midterm" required style={{ fontSize: '13px' }} />
          <input name="grade" className="form-input" type="number" placeholder="Grade %" min="0" max="100" step="0.1" style={{ fontSize: '13px' }} />
          <input name="weight" className="form-input" type="number" placeholder="Weight %" min="0" max="100" step="0.1" required style={{ fontSize: '13px' }} />
        </div>
      </form>
    </div>
  );

  const renderAiView = () => (
    <div className="view-content">
      <div className="view-header">
        <h1 className="view-title">AI Assistant</h1>
      </div>

      <div className="section-label">Quick Add Task</div>
      <form onSubmit={handleAiCreateTask} style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        <input
          className="form-input"
          type="text"
          placeholder="e.g., 'ECO102 midterm next Friday at 6pm'"
          value={aiInput}
          onChange={e => setAiInput(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }} disabled={actionLoading === 'aiCreate'}>
          {actionLoading === 'aiCreate' ? <FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FiPlus />}
        </button>
      </form>

      <div className="section-label">Chat</div>
      <div className="chat-container" style={{ marginBottom: '12px' }}>
        {chatMessages.length === 0 && !chatLoading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '32px', fontSize: '14px' }}>
            Ask me anything about studying, deadlines, or planning...
          </div>
        ) : (
          <>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <strong>{msg.role === 'user' ? 'You' : 'AI'}</strong>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{msg.content}</p>
              </div>
            ))}
            {chatLoading && (
              <div className="chat-message assistant">
                <div className="typing-indicator"><span /><span /><span /></div>
              </div>
            )}
          </>
        )}
      </div>
      <form
        onSubmit={e => {
          e.preventDefault();
          const q = e.target.question.value.trim();
          if (q) { handleAiChat(q); e.target.question.value = ''; }
        }}
        style={{ display: 'flex', gap: '8px' }}
      >
        <input name="question" className="form-input" type="text" placeholder="Ask anything..." disabled={chatLoading} />
        <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }} disabled={chatLoading}>
          {chatLoading ? <FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Send'}
        </button>
      </form>
    </div>
  );

  const renderSettingsView = () => (
    <div className="view-content">
      <div className="view-header">
        <h1 className="view-title">Settings</h1>
      </div>

      {/* Term config */}
      <div className="section-label">Term Configuration</div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', marginTop: '-8px' }}>
        Set your semester dates to help the AI calculate task dates from your syllabi.
      </p>
      <form id="settings-form-inline" onSubmit={handleSaveTermConfig} style={{ marginBottom: '40px' }}>
        <div className="form-group">
          <label className="form-label">Term Name</label>
          <input className="form-input" type="text" placeholder="e.g., Winter 2026" value={termForm.term_name} onChange={e => setTermForm({ ...termForm, term_name: e.target.value })} required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Term Start</label>
            <input className="form-input" type="date" value={termForm.start_date} onChange={e => setTermForm({ ...termForm, start_date: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Term End</label>
            <input className="form-input" type="date" value={termForm.end_date} onChange={e => setTermForm({ ...termForm, end_date: e.target.value })} required />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Reading Week Start</label>
            <input className="form-input" type="date" value={termForm.reading_week_start} onChange={e => setTermForm({ ...termForm, reading_week_start: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Reading Week End</label>
            <input className="form-input" type="date" value={termForm.reading_week_end} onChange={e => setTermForm({ ...termForm, reading_week_end: e.target.value })} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Exam Period Start</label>
            <input className="form-input" type="date" value={termForm.exam_period_start} onChange={e => setTermForm({ ...termForm, exam_period_start: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Exam Period End</label>
            <input className="form-input" type="date" value={termForm.exam_period_end} onChange={e => setTermForm({ ...termForm, exam_period_end: e.target.value })} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary"><FiCheck /> Save Term</button>
      </form>

      {/* Recurring tasks */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Recurring Tasks</div>
        <button className="btn btn-sm btn-secondary" onClick={async () => {
          try { const r = await api.expandRecurring(); showToast(`Expanded ${r.data.created} tasks!`); loadData(); }
          catch { showToast('Expand failed', 'error'); }
        }}><FiRepeat size={14} /> Expand All</button>
      </div>
      <div style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '16px' }} />
      {recurringTasks.map(rt => (
        <div key={rt.id} className="task-row" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '500', fontSize: '14px' }}>{rt.title}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {rt.course && <span style={{ color: getCourseColor(rt.course), marginRight: '8px', fontWeight: '600' }}>{rt.course}</span>}
              {rt.frequency} · {rt.day_of_week} at {rt.time || '12:00'} · {rt.estimated_minutes}min
            </div>
          </div>
          <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={async () => {
            await api.deleteRecurring(rt.id); showToast('Deleted'); loadData();
          }}><FiTrash2 size={14} /></button>
        </div>
      ))}
      <div style={{ marginTop: '20px', marginBottom: '40px' }}>
        <div className="section-label">Add Recurring</div>
        <div className="form-group">
          <input className="form-input" type="text" placeholder="Task title" value={newRecurring.title} onChange={e => setNewRecurring({ ...newRecurring, title: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <select className="form-select" value={newRecurring.course} onChange={e => setNewRecurring({ ...newRecurring, course: e.target.value })} style={{ fontSize: '13px' }}>
            <option value="">No course</option>
            {courses.map(c => <option key={c.id} value={c.code}>{c.code}</option>)}
          </select>
          <select className="form-select" value={newRecurring.day_of_week} onChange={e => setNewRecurring({ ...newRecurring, day_of_week: e.target.value })} style={{ fontSize: '13px' }}>
            {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input className="form-input" type="time" value={newRecurring.time} onChange={e => setNewRecurring({ ...newRecurring, time: e.target.value })} style={{ fontSize: '13px' }} />
          <input className="form-input" type="number" min="15" step="15" value={newRecurring.estimated_minutes} onChange={e => setNewRecurring({ ...newRecurring, estimated_minutes: parseInt(e.target.value) })} style={{ fontSize: '13px' }} />
        </div>
        <button className="btn btn-primary btn-sm" onClick={async () => {
          if (!newRecurring.title.trim()) { showToast('Title required', 'error'); return; }
          await api.createRecurring(newRecurring);
          setNewRecurring({ title: '', course: '', frequency: 'weekly', day_of_week: 'Monday', time: '12:00', estimated_minutes: 60, priority: 3 });
          showToast('Added!'); loadData();
        }}><FiPlus size={14} /> Add</button>
      </div>

      {/* Export */}
      <div className="section-label">Export</div>
      <div style={{ borderBottom: '1px solid var(--border-light)', marginBottom: '16px' }} />
      <button className="btn btn-secondary" onClick={handleExportIcal}><FiDownload /> Export to iCal</button>
    </div>
  );

  // ===== RENDER =====
  return (
    <div className="App">

      {/* ===== SIDEBAR ===== */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <FiBook size={19} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span>Study Planner</span>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Views</div>
          {[
            { view: 'home', icon: <FiHome size={17} />, label: 'Upcoming' },
            { view: 'calendar', icon: <FiCalendar size={17} />, label: 'Calendar' },
            { view: 'ai', icon: <FiMessageSquare size={17} />, label: 'AI Assistant' },
            { view: 'grades', icon: <FiBarChart2 size={17} />, label: 'Grades' },
            { view: 'settings', icon: <FiSettings size={17} />, label: 'Settings' },
          ].map(({ view, icon, label }) => (
            <button
              key={view}
              className={`nav-item ${activeView === view ? 'active' : ''}`}
              onClick={() => setActiveView(view)}
            >
              {icon}
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Courses */}
        <div className="sidebar-courses-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-label" style={{ padding: '0' }}>Courses</span>
            <button className="btn-icon" onClick={() => setShowCoursePanel(true)} title="Manage courses">
              <FiPlus size={15} />
            </button>
          </div>
          <div className="sidebar-courses-list">
            <button
              className={`sidebar-course-item ${selectedCourses.length === 0 ? 'active' : ''}`}
              onClick={() => setSelectedCourses([])}
            >
              <span className="sidebar-course-dot" style={{ background: 'var(--border)' }} />
              <span className="sidebar-course-name">All Courses</span>
              <span className="sidebar-course-count">{tasks.filter(t => t.status !== 'done').length}</span>
            </button>
            {courseTaskCounts.map(c => (
              <button
                key={c.id}
                className={`sidebar-course-item ${selectedCourses.includes(c.code) ? 'active' : ''}`}
                onClick={() => toggleCourseFilter(c.code)}
              >
                <span className="sidebar-course-dot" style={{ background: c.color }} />
                <span className="sidebar-course-name">{c.code}</span>
                <span className="sidebar-course-count">{c.taskCount}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="sidebar-streak">
          <FiZap size={13} style={{ color: streak >= 1 ? 'var(--accent-yellow)' : 'var(--text-tertiary)', flexShrink: 0 }} />
          <span className="sidebar-streak-text">{streak} day streak</span>
        </div>

        {/* Bottom: focus toggle + refresh + user */}
        <div className="sidebar-bottom">
          <button
            className="btn-icon"
            title="Focus Timer"
            onClick={() => setShowPomodoro(p => !p)}
            style={showPomodoro ? { color: 'var(--primary)' } : {}}
          >
            <FiClock size={16} />
          </button>
          <button className="btn-icon" title="Refresh data" onClick={loadData}>
            <FiRefreshCw size={16} />
          </button>
          <div ref={userButtonRef} />
        </div>
      </aside>

      {/* ===== MAIN VIEW ===== */}
      <main className="main-view">
        {activeView === 'home' && renderHomeView()}
        {activeView === 'calendar' && renderCalendarView()}

        {activeView === 'grades' && renderGradesView()}
        {activeView === 'ai' && renderAiView()}
        {activeView === 'settings' && renderSettingsView()}
      </main>

      {/* ===== COURSE PANEL ===== */}
      {showCoursePanel && (
        <div className="panel-overlay" onClick={() => setShowCoursePanel(false)}>
          <div className="course-panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <h2>Courses</h2>
              <button className="btn-icon" onClick={() => setShowCoursePanel(false)}><FiX /></button>
            </div>
            <div className="panel-body">
              {/* Existing courses */}
              {courses.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                    Your Courses ({courses.length})
                  </div>
                  {courses.map(course => {
                    const courseSchedules = schedules.filter(s => s.course_id === course.id);
                    return (
                      <div key={course.id} style={{ border: '1px solid var(--border-light)', borderLeft: `4px solid ${course.color}`, borderRadius: 'var(--radius)', marginBottom: '8px', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: '600', color: course.color, fontSize: '14px' }}>{course.code}</div>
                            {course.name && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{course.name}</div>}
                            {course.term && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{course.term}</div>}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button className="btn-icon" title="Edit" onClick={() => { setEditingCourse(editingCourse === course.id ? null : course.id); setEditCourseForm({ name: course.name || '', term: course.term || '', color: course.color || '#667eea' }); }}><FiEdit size={14} /></button>
                            <button className="btn-icon" title="Syllabus" onClick={() => { setSyllabusCourse(course.code); setShowSyllabusUpload(true); }}><FiUpload size={14} /></button>
                            <button className="btn-icon" title="Schedule" onClick={() => setAddingScheduleFor(addingScheduleFor === course.id ? null : course.id)}><FiCalendar size={14} /></button>
                            <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={async () => {
                              if (window.confirm(`Delete ${course.code}?`)) { await api.deleteCourse(course.id); loadData(); }
                            }}><FiTrash2 size={14} /></button>
                          </div>
                        </div>

                        {editingCourse === course.id && (
                          <div style={{ borderTop: '1px solid var(--border-light)', padding: '10px 14px', background: 'var(--bg-secondary)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                              <input className="form-input" type="text" placeholder="Course name" value={editCourseForm.name} onChange={e => setEditCourseForm({ ...editCourseForm, name: e.target.value })} style={{ fontSize: '12px' }} />
                              <input className="form-input" type="text" placeholder="Term" value={editCourseForm.term} onChange={e => setEditCourseForm({ ...editCourseForm, term: e.target.value })} style={{ fontSize: '12px' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Color:</span>
                              <input type="color" value={editCourseForm.color} onChange={e => setEditCourseForm({ ...editCourseForm, color: e.target.value })} style={{ width: '36px', height: '28px', border: 'none', cursor: 'pointer', background: 'transparent' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button type="button" className="btn btn-sm btn-success" style={{ flex: 1 }} onClick={async () => {
                                await api.updateCourse(course.id, { code: course.code, ...editCourseForm });
                                setEditingCourse(null); showToast('Updated!'); loadData();
                              }}><FiCheck size={12} /> Save</button>
                              <button type="button" className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => setEditingCourse(null)}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {courseSchedules.length > 0 && (
                          <div style={{ borderTop: '1px solid var(--border-light)', padding: '6px 14px', background: 'var(--bg-secondary)' }}>
                            {courseSchedules.map(sched => (
                              <div key={sched.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', fontSize: '12px' }}>
                                <span>
                                  <span style={{ fontWeight: '500', textTransform: 'capitalize' }}>{sched.class_type}</span>
                                  {' — '}{getDayName(sched.day_of_week)} {sched.start_time}–{sched.end_time}
                                  {sched.location && <span style={{ color: 'var(--text-tertiary)' }}> @ {sched.location}</span>}
                                </span>
                                <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteSchedule(sched.id)}><FiX size={13} /></button>
                              </div>
                            ))}
                          </div>
                        )}

                        {addingScheduleFor === course.id && (
                          <div style={{ borderTop: '1px solid var(--border-light)', padding: '10px 14px', background: 'var(--bg-secondary)' }}>
                            <form onSubmit={e => handleAddSchedule(e, course.id)}>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                <select className="form-select" value={newSchedule.class_type} onChange={e => setNewSchedule({ ...newSchedule, class_type: e.target.value })} style={{ fontSize: '12px' }}>
                                  <option value="lecture">Lecture</option>
                                  <option value="tutorial">Tutorial</option>
                                  <option value="lab">Lab</option>
                                  <option value="practical">Practical</option>
                                </select>
                                <select className="form-select" value={newSchedule.day_of_week} onChange={e => setNewSchedule({ ...newSchedule, day_of_week: parseInt(e.target.value) })} style={{ fontSize: '12px' }}>
                                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d, i) => <option key={i} value={i}>{d}</option>)}
                                </select>
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                                <input className="form-input" type="time" value={newSchedule.start_time} onChange={e => setNewSchedule({ ...newSchedule, start_time: e.target.value })} required style={{ fontSize: '12px' }} />
                                <input className="form-input" type="time" value={newSchedule.end_time} onChange={e => setNewSchedule({ ...newSchedule, end_time: e.target.value })} required style={{ fontSize: '12px' }} />
                              </div>
                              <input className="form-input" type="text" placeholder="Location (optional)" value={newSchedule.location} onChange={e => setNewSchedule({ ...newSchedule, location: e.target.value })} style={{ marginBottom: '6px', fontSize: '12px' }} />
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button type="submit" className="btn btn-sm btn-success" style={{ flex: 1 }}><FiPlus size={12} /> Add Class</button>
                                <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAddingScheduleFor(null)} style={{ flex: 1 }}>Cancel</button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add new course */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Add New Course</div>
                <form onSubmit={async e => {
                  e.preventDefault();
                  await api.createCourse(newCourse);
                  setNewCourse({ code: '', name: '', term: '', color: '#667eea' });
                  showToast('Course added!'); loadData();
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                    <input className="form-input" type="text" placeholder="Code (e.g., ECO102)" value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value.toUpperCase() })} required />
                    <input className="form-input" type="text" placeholder="Term" value={newCourse.term} onChange={e => setNewCourse({ ...newCourse, term: e.target.value })} />
                  </div>
                  <input className="form-input" type="text" placeholder="Course name (optional)" value={newCourse.name} onChange={e => setNewCourse({ ...newCourse, name: e.target.value })} style={{ marginBottom: '8px' }} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', marginBottom: '10px' }}>
                    {courseColors.map(color => (
                      <div key={color} onClick={() => setNewCourse({ ...newCourse, color })} style={{ aspectRatio: '1', background: color, borderRadius: '6px', cursor: 'pointer', border: newCourse.color === color ? '3px solid var(--text-primary)' : '2px solid transparent', transition: 'var(--transition)' }} />
                    ))}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%' }}><FiPlus /> Add Course</button>
                </form>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
                <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => { setShowSyllabusUpload(true); }}>
                  <FiUpload /> Upload Syllabus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Add Task */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Task</h2>
              <button className="btn-icon" onClick={() => setShowAddTask(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <form id="add-task-form" onSubmit={handleAddTask}>
                <div className="form-group">
                  <label className="form-label">Task Title</label>
                  <input className="form-input" type="text" placeholder="e.g., Complete Problem Set 3" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <select className="form-select" value={newTask.course} onChange={e => setNewTask({ ...newTask, course: e.target.value })}>
                    <option value="">No course</option>
                    {courses.map(c => <option key={c.id} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ''}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Due Date & Time</label>
                  <input className="form-input" type="datetime-local" value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Estimated Time (min)</label>
                    <input className="form-input" type="number" value={newTask.estimated_minutes} onChange={e => setNewTask({ ...newTask, estimated_minutes: parseInt(e.target.value) })} min="15" step="15" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority (1–5)</label>
                    <select className="form-select" value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}>
                      <option value="1">1 — Low</option>
                      <option value="2">2</option>
                      <option value="3">3 — Medium</option>
                      <option value="4">4</option>
                      <option value="5">5 — High</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddTask(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit" form="add-task-form" disabled={actionLoading === 'addTask'}>
                {actionLoading === 'addTask' ? <><FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><FiPlus /> Create Task</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task */}
      {editingTask && (
        <div className="modal-overlay" onClick={() => setEditingTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Task</h2>
              <button className="btn-icon" onClick={() => setEditingTask(null)}><FiX /></button>
            </div>
            <div className="modal-body">
              <form id="edit-task-form" onSubmit={handleUpdateTask}>
                <div className="form-group">
                  <label className="form-label">Task Title</label>
                  <input className="form-input" type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <select className="form-select" value={editForm.course} onChange={e => setEditForm({ ...editForm, course: e.target.value })}>
                    <option value="">No course</option>
                    {courses.map(c => <option key={c.id} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ''}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Due Date</label>
                    <input className="form-input" type="date" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due Time</label>
                    <input className="form-input" type="time" value={editForm.due_time} onChange={e => setEditForm({ ...editForm, due_time: e.target.value })} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Estimated Time (min)</label>
                    <input className="form-input" type="number" value={editForm.estimated_minutes} onChange={e => setEditForm({ ...editForm, estimated_minutes: parseInt(e.target.value) })} min="15" step="15" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Priority (1–5)</label>
                    <select className="form-select" value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: parseInt(e.target.value) })}>
                      <option value="1">1 — Low</option>
                      <option value="2">2</option>
                      <option value="3">3 — Medium</option>
                      <option value="4">4</option>
                      <option value="5">5 — High</option>
                    </select>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingTask(null)}>Cancel</button>
              <button className="btn btn-primary" type="submit" form="edit-task-form" disabled={actionLoading === 'updateTask'}>
                {actionLoading === 'updateTask' ? <><FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><FiCheck /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in */}
      {showCheckIn && (
        <div className="modal-overlay" onClick={() => setShowCheckIn(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Daily Check-in</h2>
              <button className="btn-icon" onClick={() => setShowCheckIn(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <form id="checkin-form" onSubmit={handleCheckIn}>
                <div className="form-group">
                  <label className="form-label">Energy Level: {checkIn.energy_level}/5</label>
                  <input type="range" min="1" max="5" value={checkIn.energy_level} onChange={e => setCheckIn({ ...checkIn, energy_level: parseInt(e.target.value) })} style={{ width: '100%', marginTop: '8px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    <span>Low</span><span>High</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">How did today go?</label>
                  <textarea className="form-textarea" placeholder="What worked well? What was challenging?" value={checkIn.notes} onChange={e => setCheckIn({ ...checkIn, notes: e.target.value })} rows="4" />
                </div>
                <div className="form-group">
                  <label className="form-label">Tasks completed (optional)</label>
                  <input className="form-input" type="text" placeholder="e.g., ECO102 reading, MAT224 problem set" value={checkIn.completed_tasks} onChange={e => setCheckIn({ ...checkIn, completed_tasks: e.target.value })} />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCheckIn(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit" form="checkin-form" disabled={actionLoading === 'checkIn'}>
                {actionLoading === 'checkIn' ? <><FiRefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><FiCheck /> Save Check-in</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Syllabus Upload */}
      {showSyllabusUpload && (
        <div className="modal-overlay" onClick={() => setShowSyllabusUpload(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Syllabus</h2>
              <button className="btn-icon" onClick={() => setShowSyllabusUpload(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--spacing-lg)' }}>
                <button type="button" className={`btn btn-sm ${syllabusMode === 'file' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSyllabusMode('file')}>Upload File</button>
                <button type="button" className={`btn btn-sm ${syllabusMode === 'text' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setSyllabusMode('text')}>Paste Text</button>
              </div>
              <form id="syllabus-form" onSubmit={async e => {
                e.preventDefault();
                if (!syllabusCourse) { alert('Please select a course'); return; }
                if (syllabusMode === 'file' && !syllabusFile) { alert('Please select a file'); return; }
                if (syllabusMode === 'text' && !syllabusText.trim()) { alert('Please paste some text'); return; }
                try {
                  const fileToSend = syllabusMode === 'text'
                    ? new File([syllabusText], 'syllabus.txt', { type: 'text/plain' })
                    : syllabusFile;
                  const response = await api.uploadSyllabus(fileToSend, syllabusCourse);
                  alert(`Created ${response.data.tasks_created} tasks from syllabus!`);
                  setSyllabusFile(null); setSyllabusText(''); setSyllabusCourse('');
                  setShowSyllabusUpload(false);
                  const fileInput = document.querySelector('input[type="file"]');
                  if (fileInput) fileInput.value = '';
                  loadData();
                } catch (error) {
                  const detail = error?.response?.data?.detail || error?.message || 'Unknown error';
                  alert(`Failed to process syllabus:\n${detail}`);
                }
              }}>
                <div className="form-group">
                  <label className="form-label">Course</label>
                  <select className="form-select" value={syllabusCourse} onChange={e => setSyllabusCourse(e.target.value)} required>
                    <option value="">Select a course</option>
                    {courses.map(c => <option key={c.id} value={c.code}>{c.code}{c.name ? ` — ${c.name}` : ''}</option>)}
                  </select>
                </div>
                {syllabusMode === 'file' ? (
                  <div className="form-group">
                    <label className="form-label">File (PDF, image, or .txt)</label>
                    <input className="form-input" type="file" accept=".pdf,.txt,image/*" onChange={e => setSyllabusFile(e.target.files[0])} />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Paste syllabus text</label>
                    <textarea className="form-input" rows={10} placeholder="Paste the full syllabus text here..." value={syllabusText} onChange={e => setSyllabusText(e.target.value)} style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} />
                  </div>
                )}
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSyllabusUpload(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit" form="syllabus-form"><FiUpload /> Upload & Parse</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pomodoro */}
      {showPomodoro && (
        <PomodoroTimer
          attachedTask={pomodoroTask}
          onClose={() => setShowPomodoro(false)}
          onComplete={() => showToast('Pomodoro done!')}
        />
      )}

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? <FiCheck size={16} /> : <FiAlertCircle size={16} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;
