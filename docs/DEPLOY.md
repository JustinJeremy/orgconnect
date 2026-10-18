# Deploying OrgConnect

The backend (Laravel API + MySQL) goes on *Railway*; the frontend (React) goes on *Vercel*.
Both deploy from the GitHub repo, so every merge to `main` updates the live site by itself.

You need: the GitHub repo, a Railway account and a Vercel account (sign in to both with GitHub).

## 1. Backend and database on Railway

1. On railway.com: *New Project → Deploy from GitHub repo → JustinJeremy/orgconnect*.
2. Open the new service → *Settings*:
   - *Root Directory*: `backend`
   - Railway reads `backend/railway.json`: it builds with Railpack and, before each deploy, runs
     `php artisan migrate --force && php artisan db:seed --force` (tables and sample data).
3. Add the database: in the project, *+ New → Database → MySQL*.
4. Back in the backend service → *Variables*, add:

   | Variable | Value |
   |---|---|
   | `RAILPACK_PHP_VERSION` | `8.4` |
   | `APP_NAME` | `OrgConnect` |
   | `APP_ENV` | `production` |
   | `APP_DEBUG` | `false` |
   | `APP_KEY` | run `php artisan key:generate --show` in `backend` on your laptop and paste the result |
   | `APP_URL` | the backend's address from step 6, e.g. `https://orgconnect-backend.up.railway.app` |
   | `FRONTEND_URL` | the Vercel address from part 2, e.g. `https://orgconnect.vercel.app` (no slash at the end) |
   | `APP_TIMEZONE` | `Asia/Manila` (event times, and when QR check-in opens, are Philippine time) |
   | `DB_CONNECTION` | `mysql` |
   | `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
   | `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
   | `DB_DATABASE` | `${{MySQL.MYSQLDATABASE}}` |
   | `DB_USERNAME` | `${{MySQL.MYSQLUSER}}` |
   | `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
   | `DEMO_DAY` | `2026-10-20` (the day the sample events are "today") |
   | `LOG_CHANNEL` | `stderr` (errors show in Railway's logs) |
   | `MAIL_MAILER` | `log` (or SMTP settings for real email, see below) |

   The `${{MySQL...}}` values point at the database you added (Railway fills them in).
5. *Uploads* (photos, posters, logos, certificates) need to survive redeploys: backend service →
   *Volumes → New Volume*, mount path `/app/storage/app`.
6. *Settings → Networking → Generate Domain* (port `8080`). Copy the address into `APP_URL`.
7. Deploy. When it's done, open `https://<your-backend>/up` (should say the app is up) and
   `https://<your-backend>/api/organizations` (should list Computer Society and Data Science Society).

## 2. Frontend on Vercel

1. On vercel.com: *Add New → Project → import JustinJeremy/orgconnect*.
2. *Root Directory*: `frontend`. Framework: Vite (detected). Build command `npm run build`, output `dist`.
3. *Environment Variables*: `VITE_API_URL` = `https://<your-backend>/api`
4. Deploy, then copy the Vercel address into Railway's `FRONTEND_URL` and redeploy the backend
   (so the API accepts requests from the site).

`frontend/vercel.json` sends every page address (e.g. `/events`, `/admin/accounts`) to the app, so
refreshing or opening a link in a new tab works.

## 3. Check it

Sign in at the Vercel address with the sample accounts (password `password123`):
`officer@orgconnect.test` (CompSoc President), `member@orgconnect.test` (member of both orgs),
`andrea.lim@orgconnect.test` (DSS President) and `admin@orgconnect.test` (platform admin).
The full list is in the README.

## Real email (optional)

Approval and rejection emails for org requests are written to the log while `MAIL_MAILER=log`.
To send real email, set in Railway (Gmail example; use an *app password*, not your normal one):
`MAIL_MAILER=smtp`, `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_USERNAME=you@gmail.com`,
`MAIL_PASSWORD=<app password>`, `MAIL_FROM_ADDRESS=you@gmail.com`, `MAIL_FROM_NAME=OrgConnect`.
Notifications inside the app work either way.

## If something goes wrong

| What you see | Fix |
|---|---|
| The site loads but every request fails ("Network Error"/CORS in the console) | `FRONTEND_URL` on Railway must be exactly the Vercel address (https, no slash at the end); redeploy the backend |
| 500 errors from the API | `APP_KEY` is missing or wrong; check Railway's *Deploy Logs* |
| Build fails asking for a newer PHP | `RAILPACK_PHP_VERSION=8.4` |
| Photos and posters disappear after a redeploy | The volume isn't mounted at `/app/storage/app` |
| "Can't connect to the database" | The `DB_*` variables must use the `${{MySQL...}}` references, and the MySQL service must be running |

Each deploy re-runs the sample data: the sample items go back to how they started (e.g. a sample
hour log you approved during a demo is pending again), and anything people created stays. After the
presentation you can stop this by removing `&& php artisan db:seed --force` from `backend/railway.json`.

## QR check-in on a phone

QR check-in needs the deployed site: a phone can't open `localhost`. On the deployed site, an officer
opens an event's QR icon on a laptop; a member scans it with the phone camera, which opens the
Vercel address, signs in, and shows "You're checked in". It works from a day before the event starts
until the event is finished (completed, or the end of its day). Officers can show the QR code any time
before the event is finished (`APP_TIMEZONE` decides the times).

