# Deploying OrgConnect

The backend (Laravel API + MySQL) goes on *Railway*; the frontend (React) goes on *Vercel*.
Both deploy from the GitHub repo, so every merge to `main` updates the live site by itself.

You need: the GitHub repo, a Railway account and a Vercel account (sign in to both with GitHub).

## 1. Backend and database on Railway

1. On railway.com: *New Project → Deploy from GitHub repo → JustinJeremy/orgconnect*.
2. Open the new service → *Settings*:
   - *Root Directory*: `backend`
   - *Config-as-code* → Railway config file: `/backend/railway.json`. It builds with Railpack and,
     each time the server starts, runs `php artisan migrate --force` and `php artisan db:seed --force`
     (tables and sample data) before starting the web server. This happens at start, not in a
     pre-deploy step, because a pre-deploy step runs without the storage volume, so sample posters
     and files written there would be lost.
   - Optional: *Settings → Scale* → region **Southeast Asia (Singapore)** for both this service and
     MySQL (faster from the Philippines). Change it before the first deploy.
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
   | `PHP_INI_SCAN_DIR` | `:/app/php` (loads `backend/php/uploads.ini`, so files up to 10 MB and posters up to 5 MB can be uploaded; PHP's default is 2 MB) |
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
| Build fails with "temporary failure fetching", "failed to do request" or "context canceled" | A download on Railway's side timed out, or a second deploy canceled the first; wait a few minutes and deploy once (Ctrl+K → Deploy Latest Commit) |
| Sample posters and files show as missing (404) | The sample data was written somewhere without the volume; redeploy (the start command puts missing sample files back) |
| "Can't connect to the database" | The `DB_*` variables must use the `${{MySQL...}}` references, and the MySQL service must be running |

Each deploy re-runs the sample data: the sample items go back to how they started (e.g. a sample
hour log you approved during a demo is pending again), and anything people created stays. After the
presentation you can stop this by removing `php artisan db:seed --force;` from the start command in
`backend/railway.json`.

## QR check-in on a phone

QR check-in needs the deployed site: a phone can't open `localhost`. On the deployed site, an officer
opens an event's QR icon on a laptop; a member scans it with the phone camera, which opens the
Vercel address, signs in, and shows "You're checked in". It works from a day before the event starts
until the event is finished (completed, or the end of its day). Officers can show the QR code any time
before the event is finished (`APP_TIMEZONE` decides the times).

## Checking the upload limit

After the first deploy, open the backend service on Railway, then *Settings → Console* (or `railway ssh`), and run:

```bash
php -r 'echo ini_get("upload_max_filesize"), PHP_EOL;'
```

It should print `12M`. If it prints `2M`, check that `PHP_INI_SCAN_DIR` is exactly `:/app/php` (with the colon) and redeploy.
Until then, files over 2 MB are turned away with "That file is too large to upload".

