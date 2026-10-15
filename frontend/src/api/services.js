import api, { unwrap } from "./client.js";

// Every call the UI makes to the Laravel API lives here.
// The UI expects these JSON shapes (camelCase, e.g. from Laravel API Resources):
//
// User          { id, name, email, role: "officer"|"member", position, studentId, course, yearLevel, membershipStatus }
// Event         { id, title, category, date: "YYYY-MM-DD", time: "HH:mm", location, capacity, description,
//                 status: "upcoming"|"completed", registrations: [{ id, userId, name, status: "registered"|"attended" }] }
// HourLog       { id, userId, memberName, activity, date, hours, status: "Pending"|"Approved"|"Rejected" }
// Member        { id, name, email, position, joinDate, status: "Active"|"Inactive", approvedHours,
//                 temporaryPassword (only right after adding a brand-new account) }
// Application   { id, name, email, studentId, course, yearLevel, appliedAt, status }
// Session       { id, subject, area, tutorId, tutorName, schedule, location, slots, description }
// Request       { id, sessionId, userId, requesterName, yearLevel, status: "Pending"|"Confirmed"|"Rejected"|"Completed" }
// Resource      { id, title, subject, type, url, uploadedBy }
// Announcement  { id, title, category, content, pinned, authorName, authorPosition, createdAt, isRead, readCount }
// Notification  { id, message, createdAt, isRead }
// Leader        { id, name, hours }

const get = (url) => api.get(url).then(unwrap);
const post = (url, body) => api.post(url, body).then(unwrap);
const put = (url, body) => api.put(url, body).then(unwrap);
const patch = (url, body) => api.patch(url, body).then(unwrap);
const del = (url) => api.delete(url).then(unwrap);
// One page of a list: { data: [...], meta: { page, lastPage, total, perPage } } (see usePagedList)
const getPage = (url) => (params) => api.get(url, { params }).then((res) => res.data);

export const authApi = {
  login: (email, password, remember) => post("/login", { email, password, remember }), // -> { token, user }
  register: (data) => post("/register", data), // -> { token, user }
  me: () => get("/user"),
  updateProfile: (data) => put("/user", data), // -> updated user
  changePassword: (data) => put("/user/password", data), // { currentPassword, password, password_confirmation }
  logout: () => post("/logout"),
};

export const orgsApi = {
  list: () => get("/organizations"), // public: every org with its details and color theme
  mine: () => get("/my-organizations"), // -> [{ organizationId, role, position, status }]
  join: (slug) => post(`/organizations/${slug}/join`), // -> updated user for that org
};

export const eventsApi = {
  list: () => get("/events"),
  page: getPage("/events"), // { tab, category, search, sort, page, perPage }
  create: (data) => post("/events", data),
  update: (id, data) => put(`/events/${id}`, data),
  remove: (id) => del(`/events/${id}`),
  rsvp: (id) => post(`/events/${id}/rsvp`), // -> updated Event
  cancelRsvp: (id) => del(`/events/${id}/rsvp`), // -> updated Event
  // attendees: ids of registrations marked present
  saveAttendance: (id, attendees, completed) => put(`/events/${id}/attendance`, { attendees, completed }),
  certificate: (id) => api.get(`/events/${id}/certificate`, { responseType: "blob" }),
  certificates: () => get("/certificates"), // -> the signed-in member's certificates
};

export const hoursApi = {
  list: () => get("/hours"), // officers get every log, members get their own
  page: getPage("/hours"), // { status, search, page, perPage }
  create: (data) => post("/hours", data),
  decide: (id, status) => patch(`/hours/${id}`, { status }),
  remove: (id) => del(`/hours/${id}`),
  leaderboard: () => get("/leaderboard"),
};

export const membersApi = {
  list: () => get("/members"),
  page: getPage("/members"), // { search, page, perPage }
  exportHours: () => api.get("/members/export", { responseType: "blob" }), // CSV of every member's hours
  create: (data) => post("/members", data),
  update: (id, data) => put(`/members/${id}`, data),
  remove: (id) => del(`/members/${id}`),
  applications: () => get("/applications"),
  decideApplication: (id, status) => patch(`/applications/${id}`, { status }),
  resetPassword: (id) => post(`/members/${id}/reset-password`), // -> { temporaryPassword }
};

export const tutoringApi = {
  sessions: () => get("/tutoring-sessions"),
  sessionsPage: getPage("/tutoring-sessions"), // { area, search, page, perPage }
  createSession: (data) => post("/tutoring-sessions", data),
  updateSession: (id, data) => put(`/tutoring-sessions/${id}`, data),
  removeSession: (id) => del(`/tutoring-sessions/${id}`),
  requests: () => get("/tutoring-requests"),
  requestsPage: getPage("/tutoring-requests"), // { view: received | sent, status, page, perPage }
  request: (sessionId) => post("/tutoring-requests", { sessionId }),
  decideRequest: (id, status) => patch(`/tutoring-requests/${id}`, { status }),
  resources: () => get("/resources"),
  resourcesPage: getPage("/resources"), // { subject, type, search, page, perPage }
  createResource: (data) => post("/resources", data),
  updateResource: (id, data) => put(`/resources/${id}`, data),
  removeResource: (id) => del(`/resources/${id}`),
};

export const announcementsApi = {
  list: () => get("/announcements"),
  page: getPage("/announcements"), // { view: unread, category, search, page, perPage }
  create: (data) => post("/announcements", data),
  update: (id, data) => put(`/announcements/${id}`, data),
  remove: (id) => del(`/announcements/${id}`),
  markRead: (id) => post(`/announcements/${id}/read`),
  markAllRead: () => post("/announcements/read-all"),
};

export const notificationsApi = {
  list: () => get("/notifications"),
  markAllRead: () => post("/notifications/read-all"),
};
