# Session Log - Railway Deployment
**Date:** February 18, 2026
**Status:** BACKEND ALMOST WORKING - Frontend not started yet

---

## ✅ WHAT WAS ACCOMPLISHED

### Code Changes Made
1. **`backend/app/ai_service.py`** - Completely rewritten to remove `groq` package dependency
   - Now uses `httpx` directly to call Groq API
   - Function `call_groq()` replaces all `get_client().chat.completions.create()` calls
   - This fixed the `TypeError: Client.__init__() got an unexpected keyword argument 'proxies'` error

2. **`backend/requirements.txt`** - Removed `groq` package, pinned `httpx==0.27.2`
   ```
   # cache-bust-1
   fastapi==0.115.0
   uvicorn==0.32.0
   sqlalchemy==2.0.36
   pydantic==2.10.3
   python-multipart==0.0.12
   httpx==0.27.2
   python-dotenv==1.0.0
   pypdf2==3.0.1
   psycopg2-binary==2.9.10
   ```

3. **`backend/nixpacks.toml`** - Added to force clean Railway builds

---

## 🚂 RAILWAY STATUS

### Current Setup
- **Project name:** discerning-cat
- **Backend URL:** `https://study-planner-production-e27b.up.railway.app`
- **Services:** study-planner (Online) + Postgres (Online)
- **Root Directory:** `backend`
- **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Variables Set
- `GROQ_API_KEY` ✅ (new regenerated key)
- `DATABASE_URL` ✅ (auto-injected by Railway Postgres)

### Current Issue
- App shows **Online** in Railway dashboard
- Logs show: "Application startup complete" and "Uvicorn running on http://0.0.0.0:8000"
- BUT visiting `https://study-planner-production-e27b.up.railway.app/docs` returns "Application failed to respond"
- **Last attempted fix:** Change start command from `--port $PORT` to `--port 8000` (not yet confirmed if it worked)

---

## 🔧 NEXT STEPS FOR NEXT SESSION

### Step 1: Fix Backend URL (5 min)
1. Go to Railway → discerning-cat project → study-planner service
2. Settings → Deploy → Custom Start Command
3. Change to: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Save and redeploy
5. Test: visit `https://study-planner-production-e27b.up.railway.app/docs`
6. Should see FastAPI Swagger UI

### Step 2: Deploy Frontend to Vercel (10 min)
1. Go to https://vercel.com → Sign up with GitHub
2. Import `LynnFang00/study-planner` repo
3. Set Root Directory to `frontend`
4. Add environment variable:
   - `REACT_APP_API_URL` = `https://study-planner-production-e27b.up.railway.app`
5. Deploy → get Vercel URL

### Step 3: Update Backend CORS (5 min)
- Add Vercel URL to CORS in `backend/app/main.py`
- Push and Railway auto-redeploys

### Step 4: Test Everything (10 min)
- Visit Vercel URL
- Test: add course, add task, upload syllabus, view calendar

### Step 5: Update Resume & Apply to Jobs (rest of day)

---

## 🐛 PROBLEMS ENCOUNTERED & SOLUTIONS

| Problem | Cause | Solution |
|---------|-------|----------|
| Railway couldn't detect app | Whole repo deployed, not just backend | Set Root Directory to `backend` |
| `TypeError: proxies` on groq | groq package incompatible with new httpx | Rewrote ai_service.py to use httpx directly |
| Railway kept using old groq | Build cache | Added nixpacks.toml with `--no-cache-dir`, deleted & recreated service |
| 502 Bad Gateway | App running but port mismatch | Try hardcoding `--port 8000` instead of `$PORT` |

---

## 📁 IMPORTANT INFO

**GitHub:** https://github.com/LynnFang00/study-planner
**Railway Project:** discerning-cat
**Backend URL:** https://study-planner-production-e27b.up.railway.app
**Groq Console:** https://console.groq.com/keys

**Context for next assistant:**
"I'm deploying a full-stack study planner (React + FastAPI). Backend is on Railway (discerning-cat project), Postgres is connected. The app shows Online in Railway but returns 502. Last fix attempted: changing start command to hardcode port 8000 instead of $PORT. Need to confirm if that fixed it, then deploy frontend to Vercel."
