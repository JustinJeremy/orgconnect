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
// Application   { id, name, email, studentId, course, yearLevel, appliedAt, message, status }
// Session       { id, subject, area, tutorId, tutorName, schedule, location, slots, description }
// Request       { id, sessionId, userId, requesterName, yearLevel, status: "Pending"|"Confirmed"|"Rejected"|"Completed" }
// Resource      { id, title, subject, type, url, uploadedBy }
// Announcement  { id, title, category, content, pinned, authorName, authorPosition, createdAt, isRead, readCount,
//                 likes?, likedByMe?, commentCount? (likes/comments: once the backend adds them) }
// Notification  { id, message, createdAt, isRead }
// Leader        { id, name, hours }

const get = (url) => api.get(url).then(unwrap);
const post = (url, body) => api.post(url, body).then(unwrap);
const put = (url, body) => api.put(url, body).then(unwrap);
const patch = (url, body) => api.patch(url, body).then(unwrap);
const del = (url) => api.delete(url).then(unwrap);
// One page of a list: { data: [...], meta: { page, lastPage, total, perPage } } (see usePagedList)
const getPage = (url) => (params) => api.get(url, { params }).then((res) => res.data);

// Your own record in the selected org (Profile history pages)
// -> { hours: [{ id, activity, date, hours, status, reviewedBy }],
//      events: [{ id, title, category, date, time, location, result: "attended"|"missed"|"going", hasCertificate }],
//      certificates: [Certificate] }
export const profileApi = {
  history: () => get("/my-history"),
};

export const authApi = {
  login: (email, password, remember) => post("/login", { email, password, remember }), // -> { token, user }
  register: (data) => post("/register", data), // -> { token, user }
  me: () => get("/user"),
  updateProfile: (data) => put("/user", data), // -> updated user
  setAvatar: (avatar) => put("/user/avatar", { avatar }), // -> updated user
  // Their own photo as avatar: PNG/JPG up to 2 MB -> updated user (avatar "photo", avatarUrl)
  uploadAvatarPhoto: (file) => {
    const body = new FormData();
    body.append("photo", file);
    return post("/user/avatar/photo", body);
  },
  changePassword: (data) => put("/user/password", data), // { currentPassword, password, password_confirmation }
  logout: () => post("/logout"),
};

export const orgsApi = {
  list: () => get("/organizations"), // public: every org with its details and color theme
  mine: () => get("/my-organizations"), // -> [{ organizationId, role, position, status }]
  join: (slug, message) => post(`/organizations/${slug}/join`, { message }), // -> updated user for that org
  updateApplication: (slug, message) => put(`/organizations/${slug}/application`, { message }), // note to the officers while pending
  withdraw: (slug) => del(`/organizations/${slug}/application`), // cancel a pending application
  requestReactivation: (slug, message) => post(`/organizations/${slug}/reactivation`, { message }), // inactive members
  // Officers of the selected org: PNG/JPG up to 2 MB -> updated org (with logoUrl)
  leave: (slug, reason) => api.delete(`/organizations/${slug}/membership`, { data: { reason } }).then(unwrap), // with a reason
  // Changing the org's details (President): reviewed by the platform admin before they apply
  changeRequest: () => get("/organization/change-requests"), // -> { request: OrgChange | null }
  requestChanges: (data) => post("/organization/change-requests", data), // { ...changed fields, reason }
  uploadLogo: (file) => {
    const body = new FormData();
    body.append("logo", file);
    return post("/organization/logo", body);
  },
  removeLogo: () => del("/organization/logo"),
};

// Registering a new org (reviewed by a platform admin)
// OrgRequest { id, slug, status: "Pending"|"Active"|"Rejected", name, shortName, college, tagline, description,
//              adviser, email, courses, proofUrl, requestedBy, submittedAt, reviewedAt, reviewNote }
export const orgRequestsApi = {
  mine: () => get("/org-requests"), // the signed-in user's requests, newest first
  create: (data) => post("/org-requests", data),
};

// Platform admin
export const adminApi = {
  overview: () => get("/admin/overview"), // -> { stats, requests: [OrgRequest], organizations: [...] }
  decide: (id, decision, extra = {}) => patch(`/admin/org-requests/${id}`, { decision, ...extra }), // Approved | Rejected
  setStatus: (id, status) => patch(`/admin/organizations/${id}`, { status }), // Active | Suspended
  decideChange: (id, decision, note) => patch(`/admin/change-requests/${id}`, { decision, note }), // org detail changes
  users: getPage("/admin/users"), // { search, page, perPage } -> every account, with their orgs
  resetPassword: (id) => post(`/admin/users/${id}/reset-password`), // -> { temporaryPassword } (only the admin)
  updateUser: (id, data) => put(`/admin/users/${id}`, data), // { name, email, studentId, course, yearLevel }
  settings: () => get("/admin/settings"), // -> { detailsOpen }
  saveSettings: (data) => put("/admin/settings", data),
};

export const eventsApi = {
  list: () => get("/events"),
  page: getPage("/events"), // { tab, category, search, sort, page, perPage }
  create: (data) => post("/events", data),
  update: (id, data) => put(`/events/${id}`, data),
  remove: (id) => del(`/events/${id}`),
  // Officers: PNG/JPG up to 5 MB -> updated Event (with posterUrl)
  uploadPoster: (id, file) => {
    const body = new FormData();
    body.append("poster", file);
    return post(`/events/${id}/poster`, body);
  },
  removePoster: (id) => del(`/events/${id}/poster`), // -> updated Event
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

// People in the selected org, their profiles, the most helpful tutors, and your friends
export const peopleApi = {
  page: getPage("/people"), // { search, page, perPage } -> active members, officers first, with your friendship to each
  show: (id) => get(`/people/${id}`), // -> profile: details, stats, tutoring subjects, friendship
  helpful: () => get("/people/helpful"), // -> top tutors by completed sessions
  friends: () => get("/friends"), // -> { friends, received, sent }
  add: (id) => post(`/friends/${id}`), // send a request (or accept theirs) -> { friendship }
  accept: (id) => patch(`/friends/${id}`),
  remove: (id) => del(`/friends/${id}`), // decline, cancel or unfriend
};

export const membersApi = {
  list: () => get("/members"),
  page: getPage("/members"), // { search, page, perPage }
  exportHours: () => api.get("/members/export", { responseType: "blob" }), // CSV of every member's hours
  create: (data) => post("/members", data),
  update: (id, data) => put(`/members/${id}`, data),
  remove: (id) => del(`/members/${id}`),
  applications: () => get("/applications"),
  decideApplication: (id, status, reason) => patch(`/applications/${id}`, { status, reason }), // reason: when Rejected
  reactivations: () => get("/reactivations"), // inactive members asking to be active again
  decideReactivation: (id, status) => patch(`/reactivations/${id}`, { status }), // Approved | Declined
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
  decideRequest: (id, status, hours) => patch(`/tutoring-requests/${id}`, { status, hours }), // hours: when Completed
  cancelRequest: (id, reason) => api.delete(`/tutoring-requests/${id}`, { data: { reason } }).then(unwrap), // your own
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
  // Likes and comments on the dashboard feed
  like: (id) => post(`/announcements/${id}/like`), // -> { likes, likedByMe }
  unlike: (id) => del(`/announcements/${id}/like`), // -> { likes, likedByMe }
  comments: (id) => get(`/announcements/${id}/comments`), // -> [{ id, userName, text, createdAt }]
  addComment: (id, text, parentId = null) => post(`/announcements/${id}/comments`, { text, parentId }), // -> the new comment (parentId: a reply)
  updateComment: (id, commentId, text) => put(`/announcements/${id}/comments/${commentId}`, { text }), // author only
  deleteComment: (id, commentId) => del(`/announcements/${id}/comments/${commentId}`), // author or officer
};

export const notificationsApi = {
  list: () => get("/notifications"), // the latest 30 (the bell)
  page: getPage("/notifications"), // { view: unread, type: events|hours|tutoring|announcements|membership, page, perPage }
  markAllRead: () => post("/notifications/read-all"),
  markRead: (id) => post(`/notifications/${id}/read`), // -> updated Notification
};
