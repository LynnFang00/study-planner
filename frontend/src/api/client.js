import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

export const axiosInstance = axios.create({ baseURL: API_BASE });

export const api = {
  // Tasks
  getTasks: () => axiosInstance.get(`/api/tasks/`),
  createTask: (task) => axiosInstance.post(`/api/tasks/`, task),
  updateTask: (id, task) => axiosInstance.put(`/api/tasks/${id}`, task),
  updateTaskStatus: (id, status) =>
    axiosInstance.put(`/api/tasks/${id}/status?status=${status}`),
  deleteTask: (id) => axiosInstance.delete(`/api/tasks/${id}`),

  // Events
  getEvents: () => axiosInstance.get(`/api/events/`),
  createEvent: (event) => axiosInstance.post(`/api/events/`, event),

  // Check-ins
  getCheckIns: () => axiosInstance.get(`/api/checkins/`),
  createCheckIn: (data) => axiosInstance.post(`/api/checkins/`, data),

  // Planning
  getPlanForTomorrow: () => axiosInstance.post(`/api/plan/tomorrow`),

  // AI endpoints
  aiCreateTask: (text) => axiosInstance.post(`/api/ai/create-task`, { text }),
  aiAsk: (question) => axiosInstance.post(`/api/ai/ask`, { question }),
  aiChat: (message) => axiosInstance.post(`/api/ai/chat`, { message }),
  aiAnalyzeCheckin: (data) => axiosInstance.post(`/api/ai/analyze-checkin`, data),
  getPreferences: () => axiosInstance.get(`/api/preferences`),

  // Courses
  getCourses: () => axiosInstance.get(`/api/courses/`),
  createCourse: (course) => axiosInstance.post(`/api/courses/`, course),
  deleteCourse: (id) => axiosInstance.delete(`/api/courses/${id}`),

  // Class Schedules
  getSchedules: () => axiosInstance.get(`/api/schedules/`),
  getCourseSchedules: (courseId) => axiosInstance.get(`/api/schedules/course/${courseId}`),
  createSchedule: (schedule) => axiosInstance.post(`/api/schedules/`, schedule),
  deleteSchedule: (id) => axiosInstance.delete(`/api/schedules/${id}`),

  // Term Configuration
  getActiveTerm: () => axiosInstance.get(`/api/term/active`),
  getAllTerms: () => axiosInstance.get(`/api/term/`),
  createOrUpdateTerm: (term) => axiosInstance.post(`/api/term/`, term),

  // Syllabus upload
  uploadSyllabus: (file, courseCode) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosInstance.post(`/api/syllabus/upload?course_code=${courseCode}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Streak
  getStreak: () => axiosInstance.get('/api/checkins/streak'),

  // Export
  exportIcal: () => axiosInstance.get('/api/export/ical', { responseType: 'blob' }),

  // Course update
  updateCourse: (id, data) => axiosInstance.put(`/api/courses/${id}`, data),

  // Grades
  getGrades: () => axiosInstance.get('/api/grades/'),
  createGrade: (data) => axiosInstance.post('/api/grades/', data),
  updateGrade: (id, data) => axiosInstance.put(`/api/grades/${id}`, data),
  deleteGrade: (id) => axiosInstance.delete(`/api/grades/${id}`),
  getGradeSummary: () => axiosInstance.get('/api/grades/summary'),

  // Recurring tasks
  getRecurring: () => axiosInstance.get('/api/recurring/'),
  createRecurring: (data) => axiosInstance.post('/api/recurring/', data),
  expandRecurring: () => axiosInstance.post('/api/recurring/expand'),
  deleteRecurring: (id) => axiosInstance.delete(`/api/recurring/${id}`),
};
