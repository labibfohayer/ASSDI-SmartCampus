# ASSDI Backend Foundation (Sprint 1)

Django 5.2 LTS + Django REST Framework + PostgreSQL + SimpleJWT

## 🛠️ Stack & Architecture
- **Framework:** Django 5.2 LTS (`Django~=5.2.0`)
- **API Framework:** Django REST Framework 3.18+
- **Authentication:** SimpleJWT (Access/Refresh Tokens with Token Blacklisting)
- **Database:** PostgreSQL 16 (psycopg 3)
- **Documentation:** OpenAPI 3.0 via `drf-spectacular`
- **Environment Management:** `python-decouple` with settings split (`base`, `dev`, `prod`)

---

## 🚀 Quickstart Guide

### 1. Prerequisites
Ensure Docker and Python 3.11+ are installed on your machine.

### 2. Start PostgreSQL Database
From the project root:
```bash
docker compose up -d
```
Verify the container is running:
```bash
docker ps | grep assdi_postgres
```

### 3. Environment Variables
Copy the template to `.env`:
```bash
cp .env.example .env
```

### 4. Create Virtual Environment & Install Dependencies
```bash
# Inside the backend/ directory
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 5. Run Database Migrations
```bash
python manage.py migrate
```

### 6. Create Demo Users (Rule 6: Fake data only)
Populate 1 dummy user per role:
```bash
python manage.py create_demo_users
```

**Credentials Generated:**
| Role | Login ID | Password | Notes |
|---|---|---|---|
| `super_admin` | `admin01` | `AdminPass2026!` | Full system control |
| `coordinator` | `coord01` | `CoordPass2026!` | Course management |
| `teacher` | `teacher01` | `TeacherPass2026!` | Batch & class instruction |
| `student` | `STD-2026-042-001` | `StudentPass2026!` | Enrolled student |
| `observer` | `observer01` | `ObserverPass2026!` | Read-only reporting |

### 7. Run the Development Server
```bash
python manage.py runserver 127.0.0.1:8000
```
- **OpenAPI Swagger UI:** [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- **OpenAPI Redoc:** [http://127.0.0.1:8000/api/redoc/](http://127.0.0.1:8000/api/redoc/)
- **Django Admin:** [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

### 8. Run Automated Test Suite
```bash
pytest
```
All tests should pass.

---

## 🐳 Running with Docker
A standalone production-ready Dockerfile is provided in `backend/Dockerfile` using Python 3.12-slim:
```bash
docker build -t assdi-backend -f backend/Dockerfile .
```
