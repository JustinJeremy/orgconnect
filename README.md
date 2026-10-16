# OrgConnect

A web-based platform for student organizations: events and attendance, volunteer hours, peer tutoring,
members and announcements, for several orgs on one account.
Group 4 · IPT (Integrative Programming and Technologies) · React + Laravel full-stack project.
Supports SDG 4 (Quality Education, through peer tutoring and shared resources) and SDG 17 (Partnerships,
by connecting students, officers and orgs).

## What it does

**Members**
- RSVP to events, see them on a calendar, and download a certificate for events they attended
- Log volunteer hours for an officer to approve, and see the leaderboard
- Book peer tutoring sessions and open shared learning resources
- Read, like and comment on announcements in the dashboard feed
- Use one account for every org they join, and switch orgs from the menu

**Officers**
- Create events (with posters), record attendance and mark events completed
- Approve or reject volunteer hours and tutoring requests (never their own)
- Manage the member roster, approve applications and reactivation requests, and export hours as CSV
- Post announcements and upload the org's logo

**Platform admin**
- Review requests to register new orgs, then approve or reject them (with a reason)
- Suspend or reactivate an org

Each org has its own colors (Data Science Society ocean blue, Computer Society navy). A guided tour
(the **?** button next to the bell) walks through every feature.

## How things connect

| To get this… | …this has to happen first |
|---|---|
| A new org on OrgConnect | A student sends a registration request and the admin approves it; the student becomes its President |
| Using an org | You apply (sign up, or "Apply to join") and an officer approves you; until then you see "under review" |
| Using it again after being made inactive | You see the officer's reason, send a reactivation request, and an officer approves it |
| A certificate | You RSVP, attend, and an officer records attendance and completes the event |
| Hours counting on the leaderboard | An officer approves your log |
| A suspended org working again | The admin reactivates it |

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

The seeder creates two orgs, Computer Society (CompSoc) and Data Science Society (DSS), with sample
events, hours, tutoring and announcements, plus a semester of history for the demo (`DemoSeeder`):
past events with attendance, certificates and volunteer hours (officers miss only one or two), event
posters, and three events per org on the presentation day, **October 20, 2026** (change it with
`DEMO_DAY=2026-10-27` in `backend/.env` before seeding). Password for every account: `password123`

| Account | What it shows |
|---|---|
| `admin@orgconnect.test` | Platform admin: org requests (JPCS is waiting), all orgs, suspend/reactivate |
| `officer@orgconnect.test` (Maria Santos) | CompSoc President; DSS shows its join page |
| `andrea.lim@orgconnect.test` | DSS President; has a pending request to register JPCS |
| `member@orgconnect.test` (Juan Dela Cruz) | Member of both orgs, so switching is instant |
| `enzo.villanueva@orgconnect.test` | Inactive in CompSoc: sees the reason and can ask to be reactivated |
| `carla.mendez@orgconnect.test` | Applied to CompSoc: sees "application under review" |

<details>
<summary>Every sample account</summary>

| Name | Email | Org | Position | Status |
|---|---|---|---|---|
| OrgConnect Admin | `admin@orgconnect.test` | (platform) | Platform admin | |
| Maria Santos | `officer@orgconnect.test` | CompSoc | President | Active |
| Leo Manalo | `leo.manalo@orgconnect.test` | CompSoc | VP Academics | Active |
| Angela Rivera | `angela.rivera@orgconnect.test` | CompSoc | Secretary | Active |
| Nico Fernandez | `nico.fernandez@orgconnect.test` | CompSoc | Treasurer | Active |
| Juan Dela Cruz | `member@orgconnect.test` | CompSoc and DSS | Member | Active |
| Joanna Uy | `joanna.uy@orgconnect.test` | CompSoc | Member | Active |
| Mark Dela Rosa | `mark.delarosa@orgconnect.test` | CompSoc | Member | Active |
| Patricia Lim | `patricia.lim@orgconnect.test` | CompSoc | Member | Active |
| Ryan Castillo | `ryan.castillo@orgconnect.test` | CompSoc | Member | Active |
| Bianca Torres | `bianca.torres@orgconnect.test` | CompSoc | Member | Active |
| Enzo Villanueva | `enzo.villanueva@orgconnect.test` | CompSoc | Member | Inactive |
| Carla Mendez | `carla.mendez@orgconnect.test` | CompSoc | Member | Pending |
| Jerome Santiago | `jerome.santiago@orgconnect.test` | CompSoc | Member | Pending |
| Andrea Lim | `andrea.lim@orgconnect.test` | DSS | President | Active |
| Paolo Reyes | `paolo.reyes@orgconnect.test` | DSS | VP Academics | Active |
| Bea Navarro | `bea.navarro@orgconnect.test` | DSS | Secretary | Active |
| Marco Villareal | `marco.villareal@orgconnect.test` | DSS | Treasurer | Active |
| Carlo Mendoza | `carlo.mendoza@orgconnect.test` | DSS | Member | Active |
| Denise Tan | `denise.tan@orgconnect.test` | DSS | Member | Active |
| Miguel Ramos | `miguel.ramos@orgconnect.test` | DSS | Member | Active |
| Sofia Garcia | `sofia.garcia@orgconnect.test` | DSS | Member | Active |
| Gabriel Aquino | `gabriel.aquino@orgconnect.test` | DSS | Member | Active |
| Isabel Cruz | `isabel.cruz@orgconnect.test` | DSS | Member | Active |
| Rafael Santos | `rafael.santos@orgconnect.test` | DSS | Member | Inactive |
| Kyle Bautista | `kyle.bautista@orgconnect.test` | DSS | Member | Pending |
| Trisha Domingo | `trisha.domingo@orgconnect.test` | DSS | Member | Pending |

</details>

## Who can do what

| | Member | Treasurer and other officers | President, VPs, Secretary | President | Platform admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Events, RSVPs, hours, tutoring, feed | ✓ | ✓ | ✓ | ✓ | |
| Create events, record attendance, post announcements | | ✓ | ✓ | ✓ | |
| Approve hours and tutoring requests (not their own) | | ✓ | ✓ | ✓ | |
| Approve applications and reactivations; add, edit or remove members | | | ✓ | ✓ | |
| Promote, edit or remove officers | | | | ✓ | |
| Approve new orgs; suspend or reactivate orgs | | | | | ✓ |

Nobody can change their own position.

## Running the tests

```bash
cd backend
php artisan test
```

The tests use a separate in-memory SQLite database, so they never touch your MySQL data.
They cover sign-in and sign-up, officer vs member access, events and RSVPs, volunteer hours,
peer tutoring, members and passwords, profiles, the paged lists, the feed, pending and inactive
members, and registering a new org with the platform admin's review (`backend/tests/Feature`).

## After pulling changes

When you `git pull` new work from the group, update your copy before running it:

```bash
cd backend
composer install            # only if composer.json changed
php artisan migrate         # adds any new database tables/columns
php artisan db:seed         # refreshes the sample data, adds new sample accounts (safe to run again)

cd ../frontend
npm install                 # only if package.json changed
```

If something looks off after a big change, `php artisan migrate:fresh --seed` rebuilds the
database from scratch (this **deletes** everything in your local database).

## Accounts and passwords

- **Sign up** creates an account and an application to the selected org; an officer approves it.
  Signing up from **Register your organization** skips the application and opens the org request form.
- **Officers adding a member** on Members & Hours → Members: a brand-new account gets a
  temporary password, shown once to the officer to pass on.
- **Forgot password:** an officer resets it (key icon on the member row) and passes on the new
  temporary password. Members then change it on **Profile & settings** (click your name in the sidebar).
- **Remember me** off: you're signed out when the browser closes (and after 12 hours at most).
- Sign in, sign up and password changes allow 5 attempts per minute.
- An officer can't change the email or password of someone who also belongs to another org;
  that person changes their own on the Profile page.
- **Leaving an org** (Profile → My organizations) asks for a reason, which the officers see.
  The President hands the role to another officer first.
- **Org details** (name, description, courses...): the President requests changes with a reason,
  and they go live only after the platform admin approves.
- **Finished tutoring** counts as volunteer hours: marking a session completed asks how long it was
  and logs the hours for the tutor, for an officer to approve.
