# Study Planner

An AI-powered full-stack web app that helps university students manage courses, tasks, and schedules across a full academic term. Upload a syllabus PDF and the app automatically extracts all deadlines — no manual entry needed.

**Live demo:** [study-planner-6pe5.vercel.app](https://study-planner-6pe5.vercel.app)

---

## Features

- **Syllabus parsing** — Upload a course PDF; Llama 3.3 70B extracts all assignments, exams, and due dates automatically
- **AI assistant** — Chat to create tasks in natural language ("add a linear algebra assignment due next Friday, 2 hours")
- **Daily check-in** — Tell the AI how you're feeling; it adjusts your schedule based on your energy and workload
- **Smart scheduling** — Generates a suggested study plan for tomorrow or the full week
- **Calendar view** — Month and week views with colour-coded tasks per course
- **Course management** — Add courses with custom colours; filter tasks per course
- **Bulk operations** — Select multiple tasks to move, complete, or delete at once

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Create React App, Axios, react-icons |
| Backend | FastAPI, SQLAlchemy, Pydantic v2, Uvicorn |
| AI | Groq API — Llama 3.3 70B Versatile |
| PDF parsing | PyPDF2 |
| Database | PostgreSQL (production), SQLite (local dev) |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Architecture

```
frontend/src/App.js          React UI — all views and modals
  └── api/client.js          Axios wrapper (reads REACT_APP_API_URL)
        │
        ▼
backend/app/main.py          FastAPI route handlers
  ├── models.py              SQLAlchemy ORM (Task, Course, CheckIn, …)
  ├── ai_service.py          All Groq API calls
  ├── planner.py             Smart scheduling logic
  ├── syllabus_parser.py     PDF text extraction + AI parsing
  └── memory.py              User preference tracking
        │
        ▼
PostgreSQL (Railway) / SQLite (local)
```

---

## Local setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- A [Groq API key](https://console.groq.com) (free tier available)

### Backend
```bash
cd backend
pip install -r requirements.txt

# Create backend/.env
echo "GROQ_API_KEY=your_key_here" > .env

uvicorn app.main:app --reload
# API available at http://localhost:8000
# Swagger docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install

# Create frontend/.env.development
echo "REACT_APP_API_URL=http://127.0.0.1:8000" > .env.development

npm start
# App available at http://localhost:3000
```

---

## Deployment

Both services auto-deploy on every push to `main`.

| Service | Platform | Environment variables needed |
|---|---|---|
| Backend | Railway | `GROQ_API_KEY`, `DATABASE_URL` (auto-injected by Railway PostgreSQL plugin) |
| Frontend | Vercel | `REACT_APP_API_URL` (set to your Railway backend URL) |

```bash
git add .
git commit -m "your message"
git push   # triggers both deploys automatically
```

---

## Project structure

```
planner/
├── frontend/
│   ├── src/
│   │   ├── App.js           Main component (task management, modals, AI chat)
│   │   ├── Calendar.jsx     Month/week calendar view
│   │   ├── api/client.js    API client
│   │   └── App.css          Design system + component styles
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py          FastAPI routes
│   │   ├── models.py        Database models
│   │   ├── schemas.py       Pydantic request/response schemas
│   │   ├── ai_service.py    Groq AI integration
│   │   ├── planner.py       Scheduling algorithms
│   │   └── syllabus_parser.py  PDF → task extraction
│   ├── requirements.txt
│   └── nixpacks.toml        Railway build config
└── CLAUDE.md                AI assistant context file
```

---

## Known limitations

- No user authentication — the production database is shared across all visitors (intentional for portfolio demo; not suitable for real personal data)
- Rate limiting on AI endpoints is not yet implemented
- `GET /api/term/active` returns 404 on fresh databases (non-blocking; the app handles this gracefully)

---

*Built by [Yanlin (Lynn) Fang](https://github.com/LynnFang00)*
