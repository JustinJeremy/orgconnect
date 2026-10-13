# OrgConnect — Frontend

React 19 + Vite app for **OrgConnect**. It talks to the Laravel API in `../backend` with Axios
(Sanctum token auth). All data comes from the API and the MySQL database.

For full setup (database, backend and frontend together), see the [root README](../README.md).

## Run it

The backend must be running first (`php artisan serve` in `../backend`).

```bash
npm install
cp .env.example .env        # VITE_API_URL=http://127.0.0.1:8000/api
npm run dev                 # http://localhost:5173
```

Requires Node.js 20.19+ or 22.12+ (check with `node -v`).
Test accounts are listed in the root README.

## Folder structure

```
src/
├── main.jsx                 # Entry point: OrgProvider + AuthProvider around App
├── App.jsx                  # Landing / join screen / app, page switching, loading data, actions
├── App.css                  # All styles (colors are CSS variables at the top; each org recolors them)
├── api/
│   ├── client.js            # Axios instance: API URL, token, X-Organization header, error messages
│   └── services.js          # Every API call the UI makes (and the JSON shapes it expects)
├── context/
│   ├── OrgContext.jsx       # Organizations list and the selected org
│   └── AuthContext.jsx      # Signed-in user: login, register, profile, password, join org, logout
├── data/
│   └── constants.js         # Fixed option lists (event categories, positions, courses...)
├── hooks/
│   └── usePagination.js
├── utils/
│   ├── format.js            # Dates, times, initials, RSVP helpers
│   └── theme.js             # Applies an org's color palette
├── pages/
│   ├── Landing.jsx          # Homepage
│   ├── AuthPage.jsx         # Sign in / Sign up
│   ├── JoinOrg.jsx          # Shown when signed in but not a member of the selected org
│   ├── Dashboard.jsx        # Officer and member dashboards
│   ├── Events.jsx           # Events, RSVPs, attendance, certificates
│   ├── VolunteerHours.jsx   # Hour logs, member roster, applications, CSV export
│   ├── Tutoring.jsx         # Sessions, requests, shared resources
│   ├── Announcements.jsx    # Notice board
│   └── Profile.jsx          # Profile & settings (click your name in the sidebar)
└── components/              # Forms, cards, tables, dialogs, sidebar, top bar...
```

## Homepage shapes

Put PNG shapes in `public/images/` named `hero-top-left.png`, `hero-top-right.png`,
`hero-bottom-left.png` and `hero-bottom-right.png`. Missing files fall back to the built-in rings.
Size and position: `.hero-shape.tl / .tr / .bl / .br` in `src/App.css`.
