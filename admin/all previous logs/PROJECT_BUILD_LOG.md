# 📚 ADAPTIVE STUDY PLANNER - PROJECT BUILD LOG
**Project Start:** February 2026  
**Current Version:** v0.9 (Pre-Launch)  
**Tech Stack:** React, FastAPI, SQLite, Groq AI (Llama 3.3)

---

## 🎯 PROJECT OVERVIEW

**Purpose:** AI-powered study planner that intelligently schedules tasks, parses syllabi, and adapts to student schedules.

**Target User:** University students managing multiple courses with complex schedules.

**Unique Value Proposition:**
- Automated syllabus parsing with AI
- Smart date calculation using course schedules
- Color-coded course organization
- Bulk task management

---

## ✅ COMPLETED FEATURES (v0.9)

### Core Functionality
- [x] Task CRUD operations (Create, Read, Update, Delete)
- [x] Course management with color coding (12 color palette)
- [x] Calendar view with color-coded tasks
- [x] Task status tracking (todo, in_progress, done)
- [x] Priority system (1-5)
- [x] Estimated time tracking

### AI Features
- [x] Natural language task creation
- [x] Conversational AI assistant
- [x] Syllabus PDF parsing (works for most syllabi)
- [x] Course abbreviation resolution
- [x] Smart date extraction from text

### Smart Scheduling System ⭐ (NEW)
- [x] Course schedule management (lectures, tutorials, labs)
- [x] Weekly class timetable (day, time, location)
- [x] Term configuration (start/end dates, reading week, exam period)
- [x] AI uses schedules to fill in missing dates
- [x] Automatic weekly task generation based on class times

### UI Features
- [x] Course filter (show only selected courses)
- [x] Bulk task operations (select multiple, move, delete)
- [x] Scrollable modals
- [x] Color-coded task pills on calendar
- [x] Edit task functionality
- [x] Settings modal

### Data Persistence
- [x] SQLite database
- [x] Task model
- [x] Course model with color field
- [x] ClassSchedule model (NEW)
- [x] TermConfig model (NEW)
- [x] Event model (recurring events)
- [x] CheckIn model (daily reflections)
- [x] Preference model (AI learning)

---

## ⚠️ KNOWN ISSUES

### Critical
- None (app is stable)

### Minor
- **MAT224 syllabus parsing fails** - AI doesn't return JSON for some complex syllabi
  - Workaround: Manual task creation works
  - Fix attempt: Updated prompt, still needs refinement
- **Feb 29, 2026 date error** - AI generates invalid leap year dates
  - Impact: Low (rare occurrence)

### UI/UX
- **Too many buttons** - Header is cluttered
- **Purple/blue theme looks "AI-ish"** - Needs professional redesign
- **Mobile responsiveness** - Not tested/optimized
- **No dark mode** - Only light theme available

---

## 🚧 PARTIALLY IMPLEMENTED

### Smart Syllabus Parsing (70% complete)
**What works:**
- ✅ Parses explicit dates ("Jan 30: Midterm 1")
- ✅ Extracts weekly patterns ("quiz every Sunday")
- ✅ Converts common date formats
- ✅ Works with ECO102, ECO200, ECO202, MAT235, RLG232, most PDFs

**What doesn't work:**
- ❌ Complex table formats (MAT224)
- ❌ Indirect date references ("Week 5 after reading week")
- ❌ Multi-term courses (Y courses like ECO200Y)

**Next steps:**
- Improve AI prompt for table parsing
- Add manual date override option
- Handle "Week X" references better

---

## ❌ NOT IMPLEMENTED / FUTURE FEATURES

### High Priority (Resume-worthy)
- [ ] **Dashboard analytics** - Study time trends, completion rates, course workload visualization
- [ ] **Smart task recommendations** - AI suggests what to work on next based on deadlines, priority, energy
- [ ] **Study session timer** - Pomodoro-style timer with task tracking
- [ ] **Mobile app** - React Native version
- [ ] **Collaboration features** - Share tasks with study group
- [ ] **Google Calendar integration** - Sync tasks to Google Calendar

### Medium Priority (Nice to have)
- [ ] **Drag-and-drop calendar** - Move tasks by dragging
- [ ] **Recurring tasks** - "Study ECO102 every Tuesday"
- [ ] **Notification system** - Email/push reminders
- [ ] **Export/import** - Backup data, import from other tools
- [ ] **Multi-user support** - Authentication, user accounts
- [ ] **Course sharing** - Download others' course schedules

### Low Priority (Experimental)
- [ ] **Voice input** - "Add CSC373 assignment due Friday"
- [ ] **OCR for handwritten syllabi** - Photo → tasks
- [ ] **Predictive scheduling** - ML learns optimal study times
- [ ] **Gamification** - Streaks, achievements, points

---

## 📊 TESTING STATUS

### What's Been Tested
- ✅ Task creation/deletion with multiple courses
- ✅ Course color coding (12 courses tested)
- ✅ Syllabus upload (6 different PDFs tested)
- ✅ Schedule addition (lectures, tutorials, labs)
- ✅ Term configuration
- ✅ Course filtering
- ✅ Bulk task operations (move, delete)
- ✅ Calendar display with 50+ tasks

### What Needs Testing
- ⚠️ Long-term usage (1+ semester)
- ⚠️ Edge cases (100+ tasks, 10+ courses)
- ⚠️ Mobile browsers
- ⚠️ Different screen sizes
- ⚠️ Database migration between versions

---

## 🏗️ ARCHITECTURE

### Frontend (React)
```
frontend/src/
├── App.js (1200+ lines) - Main app logic
├── Calendar.jsx - Calendar view component
├── api/client.js - API wrapper
└── App.css - Styles (needs redesign)
```

### Backend (FastAPI + Python)
```
backend/app/
├── main.py - API endpoints, routers
├── models.py - SQLAlchemy models (7 tables)
├── schemas.py - Pydantic schemas for validation
├── ai_service.py - AI integration (Groq/Llama)
├── syllabus_parser.py - PDF parsing
├── course_memory.py - Course abbreviation resolver
├── database.py - DB connection
└── planner.py - Smart scheduling logic
```

### Database Schema
```
tables:
- tasks (id, title, course, due_date, estimated_minutes, priority, status)
- courses (id, code, name, term, color)
- class_schedules (id, course_id, class_type, day_of_week, start_time, end_time, location)
- term_config (id, term_name, start_date, end_date, reading_week_start/end, exam_period_start/end)
- events (recurring calendar events)
- checkins (daily reflections)
- preferences (AI learned preferences)
```

---

## 💼 RESUME VALUE ASSESSMENT

### Current Strengths
✅ **Full-stack development** - React frontend + Python backend  
✅ **AI integration** - Real LLM usage (not just OpenAI wrapper)  
✅ **Complex data modeling** - 7 interconnected tables  
✅ **PDF processing** - Real document parsing  
✅ **Smart algorithms** - Schedule-aware date calculation  
✅ **Professional workflow** - Iterative development, debugging, user feedback  

### What Would Make It Stand Out More

#### 1. **Analytics Dashboard** ⭐⭐⭐
**Why:** Shows data visualization skills, makes tangible impact visible
**What to add:**
- Charts showing study time per course
- Completion rate trends
- Workload heatmap (which weeks are busiest)
- "You studied 24 hours this week, 30% more than last week"

**Resume Impact:** "Built analytics dashboard visualizing 500+ student tasks with D3.js/Recharts"

#### 2. **API Documentation + Testing** ⭐⭐⭐
**Why:** Shows professional development practices
**What to add:**
- Swagger/OpenAPI docs (FastAPI has this built-in!)
- Unit tests for API endpoints
- Frontend component tests

**Resume Impact:** "Implemented comprehensive API documentation and 95% test coverage"

#### 3. **Deployment** ⭐⭐⭐
**Why:** Anyone can build localhost apps; deployed apps show completion
**Where to deploy:**
- Frontend: Vercel/Netlify (free)
- Backend: Railway/Render/Fly.io (free tier)
- Database: PostgreSQL on Supabase (free)

**Resume Impact:** "Deployed full-stack app serving [X] users" + you can demo it live in interviews

#### 4. **Performance Optimization** ⭐⭐
**Why:** Shows you think about scale
**What to add:**
- Database indexing
- Lazy loading for tasks
- Caching for course data
- Batch API requests

**Resume Impact:** "Optimized database queries reducing load time by 60%"

#### 5. **Accessibility** ⭐⭐
**Why:** Shows you care about inclusive design
**What to add:**
- Keyboard navigation
- Screen reader support
- WCAG compliance
- Color contrast fixes

**Resume Impact:** "Ensured WCAG 2.1 AA accessibility compliance"

---

## 🎨 UI REDESIGN PRIORITIES (Next Session)

### Issues to Fix
1. **Too many buttons** - Consolidate into dropdown menus
2. **Purple/blue AI aesthetic** - Move to professional color scheme
3. **Inconsistent spacing** - Standardize margins/padding
4. **No visual hierarchy** - Important actions should stand out

### Design Direction (Professional Study App)
**Inspiration:** Notion, Todoist, Google Calendar
**Colors:** Neutral base (grays, whites) + subtle accent colors
**Typography:** Clean, modern sans-serif
**Layout:** More whitespace, clearer sections

---

## 📅 RECOMMENDED NEXT STEPS

### Phase 1: UI Overhaul (1-2 days)
1. Redesign color scheme (professional palette)
2. Consolidate buttons into menus
3. Improve layout and spacing
4. Add icons from icon library (react-icons)
5. Make responsive (mobile-friendly)

### Phase 2: Analytics Dashboard (2-3 days)
1. Add Recharts library
2. Create stats page
3. Calculate study time, completion rates
4. Build weekly/monthly views

### Phase 3: Deployment (1 day)
1. Set up Vercel for frontend
2. Set up Railway for backend
3. Migrate to PostgreSQL
4. Add environment variable management

### Phase 4: Documentation (1 day)
1. Write README with screenshots
2. Create API docs
3. Add code comments
4. Record demo video

---

## 📈 METRICS TO TRACK (For Resume)

**Technical Metrics:**
- Lines of code: ~3000 (estimated)
- Database tables: 7
- API endpoints: 25+
- AI integrations: 5 different AI features
- Supported file formats: PDF

**User Metrics (if deployed):**
- Tasks created
- Syllabi parsed
- Active users
- Courses managed

---

## 🎯 COMPETITIVE ANALYSIS

**Similar apps:**
- Notion (too complex, not student-focused)
- MyStudyLife (no AI, manual entry)
- Todoist (no syllabus parsing)
- Google Calendar (no task intelligence)

**Our advantage:**
- Only app with AI syllabus parsing
- Only app with schedule-aware task generation
- Student-specific features (course colors, term config)

---

## 📝 CHANGELOG

### v0.9 (Feb 11, 2026)
- Added course schedule management
- Added term configuration
- Added smart syllabus parsing with schedule awareness
- Added course filter
- Added bulk task operations
- Added scrollable modals
- Fixed database schema (added color to courses)

### v0.8 (Feb 10, 2026)
- Added course management modal
- Added color coding (12 colors)
- Added syllabus upload
- Integrated AI for parsing
- Added calendar view
- Added task editing

### v0.7 (Earlier)
- Initial React frontend
- FastAPI backend
- Basic task CRUD
- SQLite database
- AI assistant chat

---

## 🚀 LAUNCH CHECKLIST

Before putting this on resume:
- [ ] UI redesign complete
- [ ] Analytics dashboard added
- [ ] Deployed and accessible via URL
- [ ] README with screenshots
- [ ] Demo video (2-3 minutes)
- [ ] API documentation
- [ ] At least one unique feature fully polished
- [ ] Mobile responsive
- [ ] No obvious bugs

---

**Last Updated:** February 11, 2026  
**Status:** Ready for UI redesign phase  
**Next Session Focus:** Professional UI overhaul + button consolidation
