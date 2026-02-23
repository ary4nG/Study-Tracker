# SyllabusTracker

A study tracking web app built with Django + React. Log study sessions, track topic mastery, set daily goals, monitor streaks, and review weekly progress.

---

## Features

- **GitHub OAuth login** — sign in with your GitHub account
- **Subjects & Topics** — create subjects, import topics from a syllabus, mark topics as Not Started / In Progress / Mastered
- **Study Timer** — global persistent timer with start / pause / end session flow
- **Session History** — filterable log of all past sessions (by subject + date range)
- **Daily Goal** — set a minute target, see a live progress bar update after each session
- **Streak Tracker** — consecutive study day streak with flame animation
- **Overall Progress** — SVG arc ring showing mastery % across all subjects
- **Weekly Reports** — navigate between weeks, view stat cards + donut chart (time per subject) + bar chart (mastery per subject)

---

## Tech Stack

| Layer | Stack |
|-------|-------|
| Backend | Django 5 · Django REST Framework · django-allauth (GitHub OAuth) |
| Database | SQLite (dev) |
| Frontend | React 19 · TypeScript · Vite · React Router |
| Auth | GitHub OAuth 2.0 + session cookie |
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
│   ├── models.py         # Subject, Topic, StudySession
│   ├── views.py          # REST endpoints + StreakView + WeeklyReportView
│   ├── serializers.py
│   └── tests/
├── frontend/src/
│   ├── pages/            # Dashboard, SubjectDetail, History, Reports, Login
│   ├── components/
│   │   ├── features/     # SubjectCard, DailyGoalWidget, StreakWidget, ...
│   │   ├── charts/       # StudyTimeDonutChart, MasteredBarChart
│   │   └── common/       # StudyTimerWidget, ProtectedRoute
│   ├── hooks/            # useTimer, useDailyGoal, useStreak, useWeeklyReport, ...
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
| PATCH | `/api/topics/:id/` | Update topic (incl. status) |
| GET/POST | `/api/sessions/` | List / log sessions |
| GET | `/api/sessions/streak/` | Current streak |
| GET | `/api/reports/weekly/?week=YYYY-WW` | Weekly report data |

---

## Running Tests

```bash
source venv/bin/activate
python manage.py test api
```

43 tests · 0 failures
