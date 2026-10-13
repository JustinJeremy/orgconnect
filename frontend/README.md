# OrgConnect — Frontend (UI only)

React + Vite frontend for **OrgConnect: A Web-Based Platform for Student Organization Management, Event Coordination, and Peer Tutoring**.

This is the **UI only**. All data is sample data in `src/data/mockData.js` and lives in React state, so changes reset when you refresh. The Laravel API gets connected later.

## Run it in VS Code

1. Unzip the folder and open it in VS Code (**File → Open Folder…**).
2. Open the terminal (**Terminal → New Terminal**) and run:

```bash
npm install
npm run dev
```

3. Open http://localhost:5173

Requires Node.js 20.19+ or 22.12+ (check with `node -v`).

## Demo accounts

| Role    | Email                  | Password   |
|---------|------------------------|------------|
| Officer | officer@orgconnect.edu | officer123 |
| Member  | member@orgconnect.edu  | member123  |

On the Sign in screen, the **Try a demo account: Officer · Member** links fill these in for you.
You can also create a new account on **Sign up** (new accounts are Members).
While signed in, the **View as Officer / Member** switch in the top bar lets you demo both roles.

## Folder structure

```
src/
├── main.jsx                 # Entry point, wraps App in AuthProvider
├── App.jsx                  # Landing vs. app, page switching, shared state
├── App.css                  # All styles (colors are CSS variables at the top: --navy, --accent, ...)
├── context/
│   └── AuthContext.jsx      # useContext: logged-in user + role (login, register, logout)
├── data/
│   └── mockData.js          # Sample events, members, hours, sessions, announcements…
├── utils/
│   └── format.js            # Date/time formatting, hour totals
├── pages/
│   ├── Landing.jsx          # Homepage (top bar + full-screen hero)
│   ├── AuthPage.jsx         # Sign in / Sign up screen
│   ├── Dashboard.jsx        # Stats, upcoming events, leaderboard, approvals
│   ├── Events.jsx           # Event CRUD, search, category filter, RSVP, pagination
│   ├── VolunteerHours.jsx   # Log/approve hours, member records, CSV export
│   ├── Tutoring.jsx         # Tutoring sessions, request approval flow, resources
│   └── Announcements.jsx    # Notice board
└── components/
    ├── Logo.jsx (Linked O + C logo), Rings.jsx, HeroShapes.jsx (decorative shapes)
    ├── LoginForm.jsx, SignUpForm.jsx
    ├── Sidebar.jsx, Topbar.jsx (notifications), Toast.jsx
    ├── EventCard.jsx, EventForm.jsx
    ├── HoursTable.jsx, LogHoursForm.jsx, MemberList.jsx
    ├── SessionCard.jsx, SessionForm.jsx
    ├── StatCard.jsx, Pagination.jsx, Badges.jsx, Icon.jsx
```

## Connecting to Laravel later

1. `npm install axios`
2. In each page, replace the sample data with API calls, the same way as the lab activity:

```js
// e.g. in App.jsx
useEffect(() => {
  axios.get("http://127.0.0.1:8000/api/events").then((res) => setEvents(res.data));
}, []);
```

Endpoints from the proposal: `/api/events`, `/api/members`, `/api/hours`, `/api/tutoring-sessions`, `/api/announcements`, `/api/login`, `/api/logout`.
Swap `login` / `register` in `AuthContext.jsx` for `axios.post("/api/login")` with Laravel Sanctum.

## Homepage shapes

Put your PNG shapes in `public/images/` named `hero-top-left.png`, `hero-top-right.png`,
`hero-bottom-left.png` and `hero-bottom-right.png`. Missing files fall back to the built-in rings.
Size and position: `.hero-shape.tl / .tr / .bl / .br` in `src/App.css`.
