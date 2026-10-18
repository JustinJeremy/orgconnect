# OrgConnect

A web-based platform for student organizations: events and attendance, volunteer hours, peer tutoring,
members and announcements, for several orgs on one account.
Group 4 · IPT (Integrative Programming and Technologies) · React + Laravel full-stack project.
Supports SDG 4 (Quality Education, through peer tutoring and shared resources) and SDG 17 (Partnerships,
by connecting students, officers and orgs).

## What it does

*Members*
- RSVP to events, see them on a calendar, add them to Google Calendar or a phone calendar, and download
  a certificate for events they attended
- *QR check-in:* at an event or a tutoring session, scan the code the officers or the tutor show with
  the phone camera to be marked present (signing in first if needed)
- Log volunteer hours for an officer to approve, and see the leaderboard
- Book peer tutoring sessions and open shared learning resources
- Read, like and comment on announcements in the dashboard feed
- Use one account for every org they join, and switch orgs from the menu
- *People:* browse everyone in the org (officers first), open anyone's profile (hours, events
  attended, what they tutor, students helped), add friends, and see the most helpful tutors
- *Messages:* message anyone in the same org (someone in another org is messaged from that org);
  officers also have a conversation with the OrgConnect admin (the President, VPs and Secretary write
  in it, the other officers read along). New messages show a count and a notification; chats show
  *Seen* under your latest message and *typing…* while the other side writes
- *Group chats:* start a group for a committee or study group with people from the same org; anyone in
  it can add more people, rename it or leave, and people who are added get a notification
- *Photos and files* in messages (PNG/JPG photos show in the chat; PDF, Word, Excel, PowerPoint, text,
  CSV and ZIP files download), up to 10 MB each
- *Search everything:* the Search box in the menu (or Ctrl+K) finds people, events, tutoring sessions,
  announcements, learning resources and chats in the org

*Officers*
- Create events (with posters), record attendance and mark events completed
- Show an event's check-in QR code at the venue (the square icon on the card): members scan it and are
  marked present, with names appearing as they scan. The icon shows until the event is finished; scanning
  works from a day before it starts. Tutors do the same for their sessions on meeting days. Nothing
  extra is entered when creating the event or session; the code is made the first time it's shown,
  and *New code* stops an old one working
- Approve or reject volunteer hours and tutoring requests (never their own)
- Log their own volunteer hours (My Hours tab); an officer's hours are approved by the President, a VP or
  the Secretary, so they count on the leaderboard like everyone else's
- Manage the member roster, approve applications and reactivation requests, and export hours as CSV
- Post announcements (with a photo or file if they like) and upload the org's logo

*Platform admin*
- Review requests to register new orgs: approve (with an optional message) or reject (with a reason).
  The requester gets a notification and an email (with the org's details when approved)
- View any org's details, officers and numbers; suspend it (with a reason its officers see) or reactivate it
- Send announcements to presidents, all officers, all members or every account, in every org or chosen
  ones. Each org's President, VPs and Secretary can reply in a private thread with the admin
- Message an org's officers, and ask someone registering an org for changes (they answer and edit
  their request before the admin decides)
- Look up accounts, correct details and reset forgotten passwords

Each org has its own colors (Data Science Society ocean blue, Computer Society navy). A new org picks one
of five other shades of blue when it registers (or later, through a details change the admin approves);
no two orgs share a color. A guided tour
(the *?* button next to the bell) walks through every feature.

## How things connect

| To get this… | …this has to happen first |
|---|---|
| A new org on OrgConnect | A student sends a registration request and the admin approves it; the student becomes its President |
| Using an org | You apply (sign up, or "Apply to join") and an officer approves you; until then you see "under review" |
| Using it again after being made inactive | You see the officer's reason, send a reactivation request, and an officer approves it |
| A certificate | You RSVP (or just turn up), check in with the QR code or an officer ticks you in Attendance, and the event is completed |
| Checking in with a QR code | From a day before the event starts until it's finished (completed, or the end of its day); officers can show the QR code any time before that. Tutoring: a meeting day, with a confirmed request |
| Hours counting on the leaderboard | An officer approves your log (an officer's own log: the President, a VP or the Secretary) |
| Being friends | You send a request (People page or their profile) and they accept it; friends see each other's email |
| A place on "Most helpful" | You tutor a session and mark the request completed |
| Messaging someone | You're both active members of the org you have open (the OrgConnect admin: you're an officer there) |
| Being in a group chat | Someone in the group adds you (both active members of that org); you can leave any time |
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

## Deploying

Railway (Laravel API + MySQL) and Vercel (React): step by step in [docs/DEPLOY.md](docs/DEPLOY.md).

## Test accounts

The seeder creates two orgs, Computer Society (CompSoc) and Data Science Society (DSS), with sample
events, hours, tutoring and announcements, plus a semester of history for the demo (`DemoSeeder`):
past events with attendance, certificates and volunteer hours (officers miss only one or two), event
posters, and three events per org on the presentation day, *October 20, 2026* (change it with
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
peer tutoring, QR check-in, messages (with Seen and typing, group chats, photos and files), search, members and passwords, profiles, the paged
lists, the feed, pending and inactive members, and registering a new org with the platform admin's review (`backend/tests/Feature`).

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
database from scratch (this *deletes* everything in your local database).

## Accounts and passwords

- *Sign up* creates an account and an application to the selected org; an officer approves it.
  Signing up from *Register your organization* skips the application and opens the org request form.
- *Officers adding a member* on Members & Hours → Members: a brand-new account gets a
  temporary password, shown once to the officer to pass on.
- *Forgot password:* only the platform admin resets it (Admin → *Accounts*) and passes on the new
  temporary password. Members then change it on *Profile & settings* (click your name in the sidebar).
  The admin has a Profile & settings page too (click your name in the admin sidebar).
- *Remember me* off: you're signed out when the browser closes (and after 12 hours at most).
- Sign in, sign up and password changes allow 5 attempts per minute.
- *Personal details are locked* (name, student ID, email, course, year). Officers editing a member
  change only position and status. The admin corrects mistakes (Admin → Accounts → *Edit details*)
  and, at the start of a new school year, turns on *Let students update their details* so everyone
  can update their own on Profile, then turns it off again.
- *Leaving an org* (Profile → My organizations) asks for a reason, which the officers see.
  The President hands the role to another officer first.
- *Org details* (name, description, courses...): the President requests changes with a reason,
  and they go live only after the platform admin approves.
- *Finished tutoring* counts as volunteer hours: marking a session completed asks how long it was
  and logs the hours for the tutor, for an officer to approve.
