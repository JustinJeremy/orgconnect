# OrgConnect

A web-based platform for student organization events, volunteer hours, and peer tutoring.
Group 4 · IPT (Integrative Programming and Technologies) · React + Laravel full-stack project.

## Folders

```
orgconnect/
├── backend/    Laravel 13 REST API (PHP 8.4+, MySQL, Sanctum)
├── frontend/   React 19 + Vite app (talks to the API with Axios)
└── docs/       Proposal, requirements, and Phase 1 prototype
```

## Run it locally

You need PHP 8.4.1 or newer, Composer, Node.js 20.19+ (or 22.12+), and MySQL (XAMPP works).

### 1. Database

Start MySQL in XAMPP, open phpMyAdmin, and create an empty database named `orgconnect`.

### 2. Backend (terminal 1)

```bash
cd backend
composer install
cp .env.example .env        # then check the DB_ settings in .env
php artisan key:generate
php artisan migrate --seed
php artisan serve           # http://127.0.0.1:8000
```

### 3. Frontend (terminal 2)

```bash
cd frontend
npm install
cp .env.example .env        # VITE_API_URL=http://127.0.0.1:8000/api
npm run dev                 # http://localhost:5173
```

## Test accounts

Password for all: `password123`

| Account | What it shows |
|---|---|
| `member@orgconnect.test` (Juan) | Member of both orgs, so switching is instant |
| `officer@orgconnect.test` (Maria) | Officer in Computer Society only; Data Science Society shows the join page |
| `andrea.lim@orgconnect.test` | Data Science Society President (officer view) |
