# ASSDI SmartCampus

Comprehensive Academic ERP, Attendance & Learning Progress Management Platform  
Developed for As-Sunnah Skill Development Institute (Dhaka, Bangladesh).

[![Frontend: Cloudflare Pages](https://img.shields.io/badge/Frontend-Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://assdi-smartcampus.pages.dev)
[![Backend: Render](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)](https://assdi-backend-egu4.onrender.com)
[![Database: Neon PostgreSQL](https://img.shields.io/badge/Database-Neon_PostgreSQL-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![API Docs: Swagger](https://img.shields.io/badge/OpenAPI-Swagger_3.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://assdi-backend-egu4.onrender.com/api/docs/)

---

## 🌐 Live Cloud Deployment

The entire system is deployed live in production:

| Component | Platform | Live URL | Status & Description |
| :--- | :--- | :--- | :--- |
| **Web Portal (SPA)** | Cloudflare Pages | **[https://assdi-smartcampus.pages.dev](https://assdi-smartcampus.pages.dev)** | Modern Islamic UI, Zero-scroll Student Dashboard, Admin & Teacher Portals (Bangla-first) |
| **Backend API** | Render Cloud | **[https://assdi-backend-egu4.onrender.com](https://assdi-backend-egu4.onrender.com)** | Django 5.2 LTS + Gunicorn Production REST API |
| **API Documentation** | Render Cloud | **[https://assdi-backend-egu4.onrender.com/api/docs/](https://assdi-backend-egu4.onrender.com/api/docs/)** | Interactive Swagger OpenAPI 3.0 Explorer |
| **ReDoc Reference** | Render Cloud | **[https://assdi-backend-egu4.onrender.com/api/redoc/](https://assdi-backend-egu4.onrender.com/api/redoc/)** | Human-readable API Schema Reference |
| **Health Check** | Render Cloud | **[https://assdi-backend-egu4.onrender.com/api/v1/health/](https://assdi-backend-egu4.onrender.com/api/v1/health/)** | Live probe endpoint (`{"status": "ok"}`) |
| **Database** | Neon.tech | PostgreSQL 16 (AWS Singapore) | Serverless PostgreSQL with connection pooling |

---

## Overview

ASSDI SmartCampus is an enterprise-grade academic management system designed to track student learning progress, automate classroom attendance, streamline daily instructional feedback, and provide administrative oversight across multi-batch training programs.

The platform was initially engineered for the Small Business Management Course (SBMC) and designed with a modular architecture that accommodates multi-course institutional expansion without schema modifications.

---

## Key Capabilities

### 1. Role-Based Access Control (RBAC)
Strict server-enforced authorization with five designated roles:
* **Super Admin:** Complete institutional authority, audit inspection, faculty member recruitment, and student lifecycle management.
* **Coordinator:** Real-time KPI monitoring, at-risk student intervention, and batch-level operational analytics.
* **Teacher:** Live classroom QR projector, manual attendance roster, student help board, micro-quiz authoring, and topic comprehension analytics.
* **Student:** Mobile and web portal for attendance check-in, 15-second daily feedback submission, assignment tracking, digital student ID card, and graduation certificate generation.
* **Observer:** Read-only institutional auditing and analytics access.

### 2. Live Dynamic QR Attendance Engine
* **Rotating Cryptographic Tokens:** Tokens regenerate every 45 seconds using time-based HMAC hashing to prevent code sharing or proxy attendance.
* **Strict Class-Time Enforcement:** QR token generation is strictly locked outside scheduled session hours.
* **Projector Mode:** Fullscreen, high-contrast display designed for auditorium projectors and overhead monitors.
* **Offline-First Resilience:** Client-side IndexedDB caching and background sync queue when network connectivity fluctuates.

### 3. Rapid Daily Feedback & Learning Analytics
* **10-15 Second Student Feedback Flow:** Streamlined single-screen submission evaluating clarity, engagement, and topic comprehension.
* **Topic Understanding Analytics:** Aggregated metric scores grouped by subject, batch, and instructor.
* **Automated Early Warning Engine:** Immediate alert generation for students with consecutive absences or falling comprehension ratings.

### 4. Faculty Governance & Batch Management
* **Faculty Roster & Assignment:** Management of primary instructors, subject assignments, and departmental allocation.
* **Multi-Batch Curriculum Scheduling:** Centralized session scheduling, room assignment, and topic sequencing.
* **Teacher Account Lifecycle:** Credential provisioning and access deactivation.

### 5. Student Lifecycle, ID Cards & Digital Certification
* **Photo Upload Support:** Integrated passport photo uploads embedded in digital documents.
* **Standardized Digital Student ID:** Instant printable ID card generation with active enrollment badges.
* **Digital Graduation Certificate:** Automated eligibility verification based on 80% minimum attendance and passing academic requirements.
* **Structured Offboarding:** Five administrative departure reason categories (Course Completed, Expelled, Voluntary Withdrawal, Prolonged Inactivity, Custom Administrative Reason) with audit log tracking.

### 6. Official Institutional Reporting Hub
Nine official SRS-standard analytical reports with tabular filtering and print/export capabilities:
* Student Attendance Summary
* Course Progress & Syllabus Tracking
* Daily Class Feedback Analysis
* Faculty Teaching Quality Metrics
* At-Risk Student Early Alerts
* Assessment & Micro-Quiz Results
* Batch-to-Batch Comparative Performance
* Student Help Request Resolution Rate
* System Audit & Administrative Change Logs

---

## System Architecture & Technology Stack

### Backend
* **Language & Runtime:** Python 3.12+
* **Framework:** Django 5.2 LTS, Django REST Framework (DRF) 3.18+
* **Database:** PostgreSQL 16 with native JSONB and connection pooling
* **Authentication:** SimpleJWT (Access and Refresh token rotation, blacklisting)
* **API Documentation:** OpenAPI 3.0 via `drf-spectacular` (Swagger UI & Redoc)
* **Testing:** Pytest, pytest-django (131 automated unit and integration tests)

### Web Dashboard
* **Framework:** Next.js 16 (App Router)
* **Language:** TypeScript 5.5+
* **Styling:** Tailwind CSS, Radix UI primitives, Lucide Icons
* **Data Visualization:** Recharts
* **State & HTTP:** Axios client with token refresh interceptors, React Context API

### Mobile Application
* **Framework:** React Native with Expo SDK 52
* **Language:** TypeScript
* **Scanner:** Expo Camera (hardware-accelerated QR barcode reader)
* **Storage:** Expo SecureStore for encrypted auth token storage

---

## Repository Structure

```
ASSDI-SmartCampus/
├── backend/
│   ├── apps/
│   │   ├── academic/         # Courses, subjects, topics, and campuses
│   │   ├── accounts/         # User models, authentication, roles, teachers
│   │   ├── assignments/      # Quizzes, homeworks, and auto-grading
│   │   ├── attendance/       # Sessions, QR tokens, attendance records
│   │   ├── audit/            # Administrative change logs and audits
│   │   ├── batches/          # Batches and academic enrollments
│   │   ├── class_sessions/   # Daily class schedules and materials
│   │   ├── feedback/         # Student daily rating submissions
│   │   ├── notifications/    # System alerts and announcements
│   │   ├── reports/          # Analytical aggregation services
│   │   └── students/         # Student profiles, ID cards, certificates
│   ├── config/               # Django settings (base, dev, prod) and URLs
│   ├── tests/                # Automated test suite (131 test cases)
│   ├── Dockerfile            # Production container configuration
│   └── requirements.txt      # Python dependencies
├── web/
│   ├── src/
│   │   ├── app/              # Next.js App Router (admin, teacher, student, coord)
│   │   ├── components/       # UI components, modals, navigation shells
│   │   ├── contexts/         # Authentication and Language (i18n) contexts
│   │   └── lib/              # API clients, offline attendance engine, utilities
│   ├── public/               # Static assets, branding, and imagery
│   └── package.json          # Node.js dependencies and scripts
├── mobile/                   # React Native Expo mobile client
├── docs/                     # SRS specifications and architectural documentation
├── docker-compose.yml        # Local PostgreSQL container definition
└── README.md
```

---

## Local Setup & Installation Guide

Follow these instructions to run both the Backend API and the Web Dashboard locally.

### Prerequisites

Ensure the following tools are installed on your host system:
* Git
* Docker and Docker Compose (recommended for PostgreSQL)
* Python 3.11 or higher
* Node.js 18.17 or higher
* npm or pnpm

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/labibfohayer/ASSDI-SmartCampus.git
cd ASSDI-SmartCampus
```

---

### Step 2: Database Provisioning

Start the local PostgreSQL 16 database using Docker Compose:

```bash
docker compose up -d
```

Verify that the database container is healthy:

```bash
docker ps --filter "name=assdi_postgres"
```

*Note: If you run PostgreSQL natively, create a database named `assdi_db` with user `assdi_user` and password `assdi_secure_password_dev`.*

---

### Step 3: Environment Configuration

Copy the root environment configuration template:

```bash
cp .env.example .env
```

The default values in `.env` are configured for local development out of the box:
```ini
DJANGO_SETTINGS_MODULE=config.settings.dev
SECRET_KEY=django-insecure-dev-key-assdi-smartcampus-2026
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0

DB_ENGINE=django.db.backends.postgresql
DB_NAME=assdi_db
DB_USER=assdi_user
DB_PASSWORD=assdi_secure_password_dev
DB_HOST=127.0.0.1
DB_PORT=5432

CORS_ALLOW_ALL_ORIGINS=True
```

---

### Step 4: Backend Setup & Seed Data

1. Open a terminal and navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
   *(On Windows: `venv\Scripts\activate`)*

3. Install required Python packages:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

5. Seed demo academic data and pre-configured accounts:
   ```bash
   python manage.py seed_demo
   ```
   *This command populates SBMC course details, subjects, batches 42 and 43, 6 faculty teachers, and 40 dummy student profiles.*

6. Start the Django backend development server:
   ```bash
   python manage.py runserver 0.0.0.0:8001
   ```

   The backend will be accessible at:
   * **API Base:** `http://localhost:8001/api/v1/`
   * **OpenAPI Swagger UI:** `http://localhost:8001/api/docs/`
   * **OpenAPI Redoc:** `http://localhost:8001/api/redoc/`
   * **Django Admin:** `http://localhost:8001/admin/`

---

### Step 5: Web Dashboard Setup

1. Open a second terminal and navigate to the `web/` directory:
   ```bash
   cd web
   ```

2. Create a local environment file `web/.env.local` to point to the backend:
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://localhost:8001" > .env.local
   ```

3. Install frontend dependencies:
   ```bash
   npm install
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev -- -p 3000
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

---

## Pre-Seeded Demo Credentials

You can test the system live immediately at **[https://assdi-smartcampus.pages.dev/login](https://assdi-smartcampus.pages.dev/login)** (or locally) using any of the pre-configured accounts:

| Role | Username / Login ID | Password | Live Route | Access & Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | `STD-2026-042-001` *(or `std_2026_001_001`)* | `StudentPass2026!` | [`/student`](https://assdi-smartcampus.pages.dev/student) | Zero-scroll modern dashboard, live attendance, QR feedback |
| **Teacher** | `TCH-2026-001` *(or `teacher_acct`)* | `TeacherPass2026!` | [`/teacher`](https://assdi-smartcampus.pages.dev/teacher) | Dynamic QR projector, attendance roster, topic rating analytics |
| **Super Admin** | `ADM-2026-001` *(or `admin01`)* | `AdminPass2026!` | [`/admin`](https://assdi-smartcampus.pages.dev/admin) | Full administrative access, faculty rosters, audit logs |
| **Coordinator** | `coord01` | `CoordPass2026!` | [`/coordinator`](https://assdi-smartcampus.pages.dev/coordinator) | Real-time batch KPIs, at-risk student intervention |
| **Observer (Auditor)** | `observer01` | `ObserverPass2026!` | [`/reports`](https://assdi-smartcampus.pages.dev/reports) | Read-only access to all 9 official analytical reports |

> ℹ️ **Cold Start Note (Render Free Tier):** On free hosting tiers, web services spin down after periods of inactivity. If the service is asleep, your first request or login may take 30–50 seconds while the backend resumes.

---

## Testing & Quality Assurance

### Backend Automated Test Suite
The backend contains 131 automated unit and integration tests covering authorization, cryptographic QR generation, consecutive absence triggers, and grading.

Run the test suite from the project root:
```bash
backend/venv/bin/pytest backend/tests/ -v
```

Expected result:
```
131 passed in 126.68s
```

### Frontend Type Verification
Verify TypeScript compilation across all pages and components:
```bash
cd web
npx tsc --noEmit
```

Expected result:
```
Exit code 0 (0 errors)
```

---

## Production Deployment Checklist

1. Set `DEBUG=False` in `.env`.
2. Generate a secure, unique `SECRET_KEY`.
3. Set specific domain origins in `CORS_ALLOWED_ORIGINS` and `ALLOWED_HOSTS`.
4. Deploy the backend with Gunicorn / Uvicorn behind Nginx:
   ```bash
   gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
   ```
5. Build and serve the Next.js frontend:
   ```bash
   cd web
   npm run build
   npm run start
   ```

---

## License

This software is developed for the As-Sunnah Skill Development Institute (ASSDI). All rights reserved.
