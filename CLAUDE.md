# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (React, Create React App)
```bash
cd frontend
npm install
npm start          # Dev server at http://localhost:3000
npm run build      # Production build (outputs to build/)
npm test           # Jest + React Testing Library
# If ESLint blocks the build:
DISABLE_ESLINT_PLUGIN=true npm run build
```

### Backend (FastAPI, Python 3.11)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload    # Dev server at http://localhost:8000
# Swagger UI: http://localhost:8000/docs
```

## Architecture

This is a full-stack AI-powered university study planner.

**Deployed:**
- Frontend: https://study-planner-6pe5.vercel.app (Vercel, auto-deploys on push to main)
- Backend: https://study-planner-production-e27b.up.railway.app (Railway, auto-deploys on push to main)

### Data flow
```
frontend/src/App.js (React UI)
  → frontend/src/api/client.js (Axios wrapper)
  → backend/app/main.py (FastAPI routes)
    ├── backend/app/models.py (SQLAlchemy ORM)
    ├── backend/app/ai_service.py (Groq API – Llama 3.3-70b)
    ├── backend/app/planner.py (smart scheduling logic)
    ├── backend/app/memory.py + course_memory.py (preference tracking)
    └── backend/app/syllabus_parser.py (PDF extraction via PyPDF2)
  → PostgreSQL (Railway prod) / SQLite (local dev: planner.db)
```

### Key files
- `frontend/src/App.js` — monolithic main component (~1450 lines): all modals, task/course/schedule management, AI chat, bulk operations, filtering; sidebar has Views (Upcoming, Calendar, AI Assistant, Grades, Settings) + Courses sections
- `frontend/src/Calendar.jsx` — calendar visualization component
- `frontend/src/PomodoroTimer.jsx` — draggable floating Pomodoro timer (drag via header, position stored in state)
- `frontend/src/api/client.js` — Axios client; reads `REACT_APP_API_URL` env var (fallback: `http://127.0.0.1:8000`)
- `backend/app/main.py` — all FastAPI route handlers (~610 lines)
- `backend/app/models.py` — 7 SQLAlchemy tables: Task, Event, CheckIn, Preference, Course, ClassSchedule, TermConfig
- `backend/app/ai_service.py` — all Groq API calls (syllabus parsing, natural language task creation, check-in analysis, chat)

### AI integration
Uses Groq API (`GROQ_API_KEY`) with Llama 3.3-70b-versatile. Key AI endpoints in `main.py`:
- `POST /api/syllabus/upload` — PDF → extracted assignments
- `POST /api/ai/create-task` — natural language → task
- `POST /api/ai/chat` — conversational task extraction
- `POST /api/ai/analyze-checkin` — check-in → scheduling recommendations

## Environment

### Backend `.env` (local)
```
GROQ_API_KEY=<your_groq_key>
# DATABASE_URL defaults to sqlite:///./planner.db if not set
```

### Frontend `.env.development` (create locally if needed)
```
REACT_APP_API_URL=http://127.0.0.1:8000
```

### Production environment variables
- Railway: `DATABASE_URL` (auto-injected by PostgreSQL plugin), `GROQ_API_KEY`
- Vercel: `REACT_APP_API_URL=https://study-planner-production-e27b.up.railway.app`

## Deployment

Both services auto-deploy on `git push` to `main`. No manual steps needed beyond:
```bash
git add .
git commit -m "message"
git push
```

Backend build uses nixpacks (`backend/nixpacks.toml`) with Python 3.11. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.

CORS is configured in `backend/app/main.py` — add new frontend origins there if needed.

## Known issues
- `GET /api/term/active` may return 404 on fresh databases (non-blocking)
- Production database is shared across all visitors (intentional for portfolio demo)
