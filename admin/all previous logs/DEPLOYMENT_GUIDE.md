# 🚀 DEPLOYMENT GUIDE - Study Planner
**Time Required:** 1 hour  
**Difficulty:** Easy (mostly clicking buttons)

---

## OVERVIEW

We'll deploy:
- **Frontend (React)** → Vercel (free, takes 10 min)
- **Backend (FastAPI)** → Railway (free tier, takes 20 min)
- **Database** → Railway PostgreSQL (free, automatic)

---

## PART 1: PREPARE YOUR CODE (10 minutes)

### Step 1: Push to GitHub

If not already on GitHub:

```bash
# In your project root
git init
git add .
git commit -m "Ready for deployment"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/study-planner.git
git push -u origin main
```

### Step 2: Update Backend for PostgreSQL

**Create `backend/requirements.txt`:**
```txt
fastapi
uvicorn
sqlalchemy
psycopg2-binary
groq
pypdf2
python-multipart
```

**Update `backend/app/database.py`:**
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use PostgreSQL in production, SQLite in development
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./planner.db"
)

# Railway provides postgres:// but SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Update `backend/app/main.py` - add CORS for your frontend:**
```python
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add after creating app
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://your-app.vercel.app",  # Update after deploying frontend
        "*"  # Remove this in production, just for testing
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## PART 2: DEPLOY BACKEND TO RAILWAY (20 minutes)

### Step 1: Sign Up for Railway
1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign up with GitHub (easier)

### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select your `study-planner` repository

### Step 3: Configure Backend Service
1. Railway will auto-detect it's a Python app
2. Click on the service
3. Go to "Settings"
4. **Root Directory:** Set to `backend`
5. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Step 4: Add PostgreSQL Database
1. In your project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway automatically creates the database
4. Railway auto-injects `DATABASE_URL` environment variable

### Step 5: Add Environment Variables
1. Click on your backend service
2. Go to "Variables" tab
3. Add:
   - `GROQ_API_KEY` = `your_groq_api_key`
   - `PORT` = `8000` (if not auto-set)

### Step 6: Deploy
1. Railway auto-deploys on push
2. Wait 2-3 minutes for build
3. Go to "Settings" → "Networking"
4. Click "Generate Domain"
5. **Copy this URL** (e.g., `https://study-planner-backend.up.railway.app`)

### Step 7: Test Backend
Visit: `https://your-backend-url.railway.app/docs`

You should see the FastAPI auto-generated docs (Swagger UI).

---

## PART 3: DEPLOY FRONTEND TO VERCEL (10 minutes)

### Step 1: Update API URL in Frontend

**Edit `frontend/src/api/client.js`:**
```javascript
const API_BASE = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
// In production, REACT_APP_API_URL will be your Railway backend URL
```

**Create `frontend/.env.production`:**
```
REACT_APP_API_URL=https://your-backend-url.up.railway.app
```

Replace with your actual Railway backend URL from Part 2, Step 6.

### Step 2: Sign Up for Vercel
1. Go to https://vercel.com
2. Click "Sign Up"
3. Sign up with GitHub

### Step 3: Import Project
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Vercel auto-detects it's a React app

### Step 4: Configure Build Settings
- **Framework Preset:** Create React App (should auto-detect)
- **Root Directory:** `frontend`
- **Build Command:** `npm run build` (default)
- **Output Directory:** `build` (default)

### Step 5: Add Environment Variables
1. Under "Environment Variables"
2. Add:
   - Key: `REACT_APP_API_URL`
   - Value: `https://your-backend-url.up.railway.app` (from Part 2)

### Step 6: Deploy
1. Click "Deploy"
2. Wait 2-3 minutes
3. Vercel gives you a URL like: `https://study-planner-xyz.vercel.app`

### Step 7: Update Backend CORS
Go back to Railway:
1. Open your backend service
2. Go to "Variables"
3. Update CORS in your `main.py` or add environment variable:
   - Add your Vercel URL to `allow_origins`

Push the update:
```bash
git add .
git commit -m "Update CORS for production"
git push
```

Railway will auto-redeploy.

---

## PART 4: TEST EVERYTHING (10 minutes)

### Visit Your App
Go to: `https://your-app.vercel.app`

### Test These Features:
- ✅ Page loads (no errors in console)
- ✅ Add a course
- ✅ Add a task manually
- ✅ View calendar
- ✅ Upload a syllabus PDF (test AI parsing)
- ✅ Edit a task
- ✅ Delete a task
- ✅ Filter by course

### Common Issues & Fixes

**Issue: "Network Error" or API calls fail**
- **Fix:** Check CORS settings in backend
- **Fix:** Verify `REACT_APP_API_URL` is set correctly
- **Check:** Railway logs (in Railway dashboard → Deployments → View Logs)

**Issue: "500 Internal Server Error"**
- **Fix:** Check Railway logs for Python errors
- **Common:** Database connection issues
- **Fix:** Verify `DATABASE_URL` is set in Railway

**Issue: Syllabus upload fails**
- **Check:** `GROQ_API_KEY` is set in Railway
- **Check:** Railway logs for API errors

**Issue: Database errors**
- **Fix:** Run migrations - in Railway, go to your backend service, click "Shell" tab:
```bash
python -c "from app.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

---

## PART 5: DOCUMENT YOUR DEPLOYMENT (10 minutes)

### Update README.md

Create `README.md` in your project root:

```markdown
# 📚 Adaptive Study Planner

AI-powered study planner that automatically parses university syllabi and manages tasks across multiple courses.

![Screenshot](screenshots/main.png)

## 🔗 Live Demo
[https://your-app.vercel.app](https://your-app.vercel.app)

## ✨ Features
- 🤖 AI syllabus parsing (upload PDF → instant task list)
- 📅 Smart calendar with color-coded courses
- ⚡ Bulk task operations
- 📊 Class schedule integration
- 🎯 Priority and time tracking

## 🛠️ Tech Stack
- **Frontend:** React, Axios, React Icons
- **Backend:** FastAPI, Python
- **Database:** PostgreSQL (SQLAlchemy ORM)
- **AI:** Groq (Llama 3.3)
- **Deployment:** Vercel (frontend), Railway (backend)

## 📸 Screenshots
[Add 3-4 screenshots here]

## 🚀 Local Development

### Backend
\`\`\`bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

## 📝 License
MIT
```

### Take Screenshots

Take 3-4 screenshots:
1. Main calendar view with tasks
2. Syllabus upload in action
3. Task list with multiple courses
4. Course management modal

Save in `screenshots/` folder, add to README.

---

## PART 6: POLISH & SHARE (10 minutes)

### Create Demo Video (2 minutes)

**Use Loom (free) or your phone:**
1. Show the homepage
2. Upload a syllabus PDF
3. Show AI-extracted tasks appearing
4. Add a manual task
5. Show calendar view
6. Filter by course

**Script (under 2 min):**
> "This is my AI-powered study planner. I can upload a course syllabus PDF..." [upload] "...and it automatically extracts all assignments with due dates." [show tasks appearing] "I can view everything in a calendar..." [show calendar] "...filter by course, and manage tasks in bulk. Built with React, FastAPI, and Llama 3.3 for AI parsing."

Upload to YouTube (unlisted is fine) or post directly on LinkedIn.

### Post on LinkedIn

```
🚀 Just deployed my AI-powered study planner!

Built a full-stack app that:
✅ Parses PDF syllabi with AI (Llama 3.3)
✅ Auto-extracts assignments & deadlines
✅ Color-coded course management
✅ Smart calendar scheduling

Tech: React, FastAPI, PostgreSQL, Groq AI

Live demo: [your-vercel-url]
Code: [your-github-url]

Looking for Summer 2026 SWE internships - DMs open!

#SoftwareEngineering #AI #FullStack #ReactJS #Python
```

Add screenshots/video.

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Code pushed to GitHub
- [ ] Backend on Railway with PostgreSQL
- [ ] Environment variables set (GROQ_API_KEY, DATABASE_URL)
- [ ] Frontend on Vercel
- [ ] API URL configured in frontend
- [ ] CORS updated in backend
- [ ] Live app tested (all features work)
- [ ] README with screenshots created
- [ ] Demo video recorded
- [ ] Posted on LinkedIn
- [ ] Live URL added to resume

---

## 🆘 TROUBLESHOOTING

### Railway Deployment Fails
1. Check logs: Railway Dashboard → Deployments → View Logs
2. Common issues:
   - Missing `requirements.txt`
   - Wrong start command
   - Python version mismatch

**Fix:** Add `runtime.txt` in backend:
```
python-3.11
```

### Vercel Build Fails
1. Check build logs in Vercel dashboard
2. Common issues:
   - `npm install` fails → check `package.json`
   - Build command wrong → verify it's `npm run build`
   - Environment variables missing

**Fix:** Verify `REACT_APP_API_URL` is set in Vercel environment variables

### Database Won't Connect
1. In Railway, check PostgreSQL service is running
2. Verify `DATABASE_URL` is automatically injected
3. Check backend logs for connection errors

**Fix:** Re-deploy backend service (Railway → Settings → Redeploy)

### CORS Errors in Browser Console
```
Access to fetch at 'https://backend.railway.app/api/tasks' 
from origin 'https://app.vercel.app' has been blocked by CORS policy
```

**Fix:** Update `backend/app/main.py`:
```python
allow_origins=[
    "https://your-app.vercel.app",
    "https://your-app-git-*.vercel.app",  # Preview deploys
]
```

Then push to trigger redeploy.

---

## 💰 COST BREAKDOWN

**Total Monthly Cost: $0**

- **Vercel:** Free (100GB bandwidth, unlimited deployments)
- **Railway:** Free ($5 credit/month, enough for hobby projects)
- **PostgreSQL on Railway:** Included in free tier
- **Groq API:** Free tier (30 requests/min, 14,400/day)

**If You Exceed Free Tier:**
- Railway: ~$5-10/month (very unlikely for personal project)
- Groq: Still free (generous limits)
- Vercel: Still free (unless you get massive traffic)

---

## ✅ YOU'RE DONE!

Your app is live. You now have:
- ✅ Live demo URL for your resume
- ✅ GitHub repo to show code
- ✅ Demo video for applications
- ✅ LinkedIn post for visibility

**Next step:** Update your resume and start applying!

---

## 📌 QUICK REFERENCE

**Your URLs:**
- Frontend: `https://______.vercel.app`
- Backend: `https://______.up.railway.app`
- GitHub: `https://github.com/______/study-planner`
- Demo Video: `https://______`

**For Resume:**
```
Adaptive Study Planner | React, Python, FastAPI, AI  
[Live Demo](your-vercel-url) | [GitHub](your-github-url)

• Engineered full-stack study planner with AI-powered PDF parsing using Llama 3.3
• Deployed production application serving 500+ tasks across 7-table PostgreSQL database
• Built responsive React interface with calendar visualization and bulk operations
• Integrated Groq AI for natural language processing and automated deadline extraction
```

**Stop. Deploy. Apply. Get hired.**
