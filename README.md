# SyllabusTracker

A study tracking web app built with Django + React. Log study sessions, track topic mastery, set daily goals, monitor streaks, and review weekly progress — now with **AI-powered syllabus parsing** and **smart topic recommendations**.

---

## Features

- **GitHub OAuth login** — sign in with your GitHub account
- **Subjects & Topics** — create subjects, import topics from a syllabus, mark topics as Not Started / In Progress / Mastered
- **✨ AI Syllabus Parser** — upload a PDF syllabus; LLaMA-3.1 extracts topics and assigns difficulty (Easy / Medium / Hard) automatically
- **🎯 Daily Focus** — smart recommendation engine surfaces the best topic to study next based on progress and difficulty
- **Study Timer** — global persistent timer with start / pause / end session flow
- **Session History** — filterable log of all past sessions (by subject + date range)
- **Daily Goal** — set a minute target, see a live progress bar update after each session
- **Streak Tracker** — consecutive study day streak with flame animation
- **Overall Progress** — SVG arc ring showing mastery % across all subjects
- **Weekly Reports** — navigate between weeks, view stat cards + donut chart (time per subject) + bar chart (mastery per subject)

### Deployment (Local Production)
To test the production build locally:
1. Build frontend: `cd frontend && npm run build`
2. Run backend with Gunicorn: `gunicorn backend.wsgi:application`

---

## 🚀 Production Deployment

### Environment Variables
For production, ensure the following are set beyond the basics:
- `DEBUG=False`
- `ALLOWED_HOSTS=your-app.com`
- `CORS_ALLOWED_ORIGINS=https://your-frontend.com`
- `LOGIN_REDIRECT_URL=https://your-frontend.com/dashboard`
- `ACCOUNT_LOGOUT_REDIRECT_URL=https://your-frontend.com/login`
- `SECURE_SSL_REDIRECT=True` (if using HTTPS)

### Deployment Manifests
- **Procfile**: Included for Gunicorn support on platforms like Render or Heroku.
- **Static Files**: Django is configured with `WhiteNoise` for serving compressed static assets.

### Scaling
For higher loads, replace SQLite with PostgreSQL by setting `DATABASE_URL` in your environment.

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Django 5 · Django REST Framework · django-allauth (GitHub OAuth) |
| Database | SQLite (dev) |
| Frontend | React 19 · TypeScript · Vite · React Router |
| Auth | GitHub OAuth 2.0 + session cookie |
| AI | Groq `llama-3.1-8b-instant` (free, 14,400 req/day) |
| PDF Parsing | `pypdf` |
| Styling | Inline React styles + pure SVG charts |

---

## Local Setup

### Prerequisites
- Python 3.12+
- Node 20+
- A GitHub OAuth App ([create one here](https://github.com/settings/developers))

### 1. Clone & install

```bash
git clone https://github.com/ary4nG/Study-Tracker.git
cd Study-Tracker
```

### 2. Backend

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the project root:

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GROQ_API_KEY=your-groq-api-key    # free at https://console.groq.com
```

```bash
python manage.py migrate
python manage.py runserver
```

### 3. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Project Structure

```
SyllabusTrackingApp/
├── api/                  # Django app — models, views, serializers, tests
│   ├── models.py         # Subject, Topic (+ difficulty), StudySession
│   ├── views.py          # REST endpoints + AI parse + recommendation
│   ├── ai_parser.py      # Groq LLaMA-3.1 integration & topic extraction
│   ├── serializers.py
│   └── tests/
├── frontend/src/
│   ├── pages/            # Dashboard, SubjectDetail, History, Reports, Login
│   ├── components/
│   │   ├── features/     # SyllabusImporter (AI+manual), DailyFocusWidget, ...
│   │   ├── charts/       # StudyTimeDonutChart, MasteredBarChart
│   │   └── common/       # StudyTimerWidget, ProtectedRoute
│   ├── hooks/            # useDailyGoal, useStreak, useWeeklyReport, ...
│   ├── context/          # AuthContext, TimerContext
│   └── services/api.ts   # Axios API client
└── requirements.txt
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/user/` | Current user info |
| GET/POST | `/api/subjects/` | List / create subjects |
| GET/POST | `/api/topics/` | List / create topics |
| PATCH | `/api/topics/:id/` | Update topic (incl. status & difficulty) |
| GET/POST | `/api/sessions/` | List / log sessions |
| GET | `/api/sessions/streak/` | Current streak |
| GET | `/api/reports/weekly/?week=YYYY-WW` | Weekly report data |
| POST | `/api/subjects/:id/ai-parse-syllabus/` | Upload PDF → AI extract topics + difficulty |
| GET | `/api/subjects/:id/recommend-topic/` | Get next recommended topic |

---

## Running Tests

```bash
source venv/bin/activate
python manage.py test api
```

52 tests · 0 failures
