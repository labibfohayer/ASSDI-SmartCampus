# ASSDI Backend Foundation (Sprint 1)

Django 5.2 LTS + Django REST Framework + PostgreSQL + SimpleJWT

## 🛠️ Stack & Architecture
- **Framework:** Django 5.2 LTS (`Django~=5.2.0`)
- **API Framework:** Django REST Framework 3.18+
- **Authentication:** SimpleJWT (Access/Refresh Tokens with Token Blacklisting)
- **Database:** PostgreSQL 16 (psycopg 3)
- **Documentation:** OpenAPI 3.0 via `drf-spectacular`
- **Environment Management:** `python-decouple` with settings split (`base`, `dev`, `prod`)

## 🌐 Production & Cloud Deployment
- **Live Base URL:** [https://assdi-backend-egu4.onrender.com](https://assdi-backend-egu4.onrender.com)
- **Live Health Check:** [https://assdi-backend-egu4.onrender.com/api/v1/health/](https://assdi-backend-egu4.onrender.com/api/v1/health/)
- **Live OpenAPI Swagger UI:** [https://assdi-backend-egu4.onrender.com/api/docs/](https://assdi-backend-egu4.onrender.com/api/docs/)
- **Live OpenAPI Redoc:** [https://assdi-backend-egu4.onrender.com/api/redoc/](https://assdi-backend-egu4.onrender.com/api/redoc/)
- **Hosted Database:** Neon.tech PostgreSQL 16 (AWS Singapore, `ap-southeast-1`)

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

### 6. Seed Academic & Student Demo Data (Sprint 2)
Populate SBMC course, departments, subjects, curriculum topics, batches, teachers and 40 students (idempotent, safe to run multiple times):
```bash
python manage.py seed_demo
```
This generates:
- **Course:** Small Business Management Course (SBMC)
- **Campus:** Kazi Bari Campus (KBC-NB)
- **Batches:** Batch 42 and Batch 43
- **Departments & Subjects:** Business Operations & Creative departments with 9 subjects
- **Teachers:** 6 teachers mapped across all subjects in both batches
- **Students:** 40 enrolled students with dummy Bengali names and mixed backgrounds (General, Aliya, Qawmi)
- **Credentials:** Prints all demo login IDs and passwords to console.

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
