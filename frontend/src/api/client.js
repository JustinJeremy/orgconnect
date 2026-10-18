import axios from "axios";

// Laravel API base URL. Set VITE_API_URL in a .env file to change it,
// e.g. VITE_API_URL=http://127.0.0.1:8000/api
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  headers: { Accept: "application/json" },
});

const TOKEN_KEY = "orgconnect_token";
const ORG_KEY = "orgconnect_org";

// "Remember me" keeps the token in localStorage (survives closing the browser);
// otherwise sessionStorage (forgotten when the browser closes).
// Each tab also keeps the account it signed in with (TAB_TOKEN_KEY, this tab's sessionStorage):
// signing in as someone else in another tab replaces the shared localStorage token, and without
// this the first tab would keep showing its account while asking the server as the new one.
const TAB_TOKEN_KEY = "orgconnect_tab_token";
export const getToken = () => sessionStorage.getItem(TAB_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
if (!sessionStorage.getItem(TAB_TOKEN_KEY) && getToken()) sessionStorage.setItem(TAB_TOKEN_KEY, getToken());
export const setToken = (token, remember = true) => {
  // Signing out here leaves another tab's newer sign-in alone
  const mine = sessionStorage.getItem(TAB_TOKEN_KEY);
  if (token || !mine || localStorage.getItem(TOKEN_KEY) === mine) localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TAB_TOKEN_KEY);
  if (token) {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TAB_TOKEN_KEY, token);
  }
};

// "Remember me" off: the token is in this tab's sessionStorage only, so a new tab (Ctrl-click,
// "Open in new tab") would start signed out. A new tab asks the open OrgConnect tabs for it instead.
// (BroadcastChannel only reaches tabs of this same site.) Closing the browser still signs you out.
const sessionChannel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("orgconnect_session");
sessionChannel?.addEventListener("message", (e) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (e.data?.type === "need-token" && token) sessionChannel.postMessage({ type: "token", token });
  // Another tab is signing out: say so if this tab is still using the same sign-in
  if (e.data?.type === "token-in-use?" && e.data.token && getToken() === e.data.token) {
    sessionChannel.postMessage({ type: "token-in-use", token: e.data.token });
  }
});

// Signing out: is another open tab still using this sign-in? (A tab opened while signed in shares it.)
// If so, the sign-out only forgets it here, so that tab keeps working as its account.
export function tokenUsedElsewhere(token, timeout = 300) {
  return new Promise((resolve) => {
    if (!sessionChannel || !token) return resolve(false);
    const finish = (used) => {
      sessionChannel.removeEventListener("message", onMessage);
      clearTimeout(timer);
      resolve(used);
    };
    const onMessage = (e) => e.data?.type === "token-in-use" && e.data.token === token && finish(true);
    sessionChannel.addEventListener("message", onMessage);
    const timer = setTimeout(() => finish(false), timeout);
    sessionChannel.postMessage({ type: "token-in-use?", token });
  });
}

// Resolves with a token from another open tab, or null if none answers in time
export function borrowSessionToken(timeout = 300) {
  return new Promise((resolve) => {
    if (!sessionChannel) return resolve(null);
    const finish = (token) => {
      sessionChannel.removeEventListener("message", onMessage);
      clearTimeout(timer);
      resolve(token);
    };
    const onMessage = (e) => {
      if (e.data?.type !== "token" || !e.data.token) return;
      sessionStorage.setItem(TOKEN_KEY, e.data.token);
      finish(e.data.token);
    };
    sessionChannel.addEventListener("message", onMessage);
    const timer = setTimeout(() => finish(null), timeout);
    sessionChannel.postMessage({ type: "need-token" });
  });
}

// The organization this tab is showing (its slug). Each tab keeps its own (sessionStorage), so two
// tabs can show two orgs side by side; localStorage remembers the last one chosen, for new tabs and
// the next visit. A link opened in a new tab carries its tab's org as ?org=, read once here.
const linkedOrg = new URLSearchParams(window.location.search).get("org");
if (linkedOrg) {
  sessionStorage.setItem(ORG_KEY, linkedOrg);
  const url = new URL(window.location.href);
  url.searchParams.delete("org");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}
// Otherwise the tab starts on the last org chosen, and keeps it even if another tab switches later
if (!sessionStorage.getItem(ORG_KEY) && localStorage.getItem(ORG_KEY)) {
  sessionStorage.setItem(ORG_KEY, localStorage.getItem(ORG_KEY));
}
export const getOrgSlug = () => sessionStorage.getItem(ORG_KEY) || localStorage.getItem(ORG_KEY);
export const setOrgSlug = (slug) => {
  for (const store of [sessionStorage, localStorage]) {
    if (slug) store.setItem(ORG_KEY, slug);
    else store.removeItem(ORG_KEY);
  }
};

// Send the Sanctum token and the selected org with every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const org = getOrgSlug();
  if (org) config.headers["X-Organization"] = org;
  return config;
});

// The server no longer accepts this tab's sign-in (signed out elsewhere, or it expired):
// AuthContext hears this and shows the sign-in screen instead of empty pages
export const SIGNED_OUT_EVENT = "orgconnect:signed-out";
api.interceptors.response.use(undefined, (error) => {
  const sent = error.config?.headers?.Authorization;
  if (error.response?.status === 401 && sent && sent === `Bearer ${getToken()}`) {
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
  }
  return Promise.reject(error);
});

// Laravel API Resources wrap results in { data: ... }; unwrap them
export const unwrap = (res) => (res.data && "data" in res.data ? res.data.data : res.data);

// A readable message from a Laravel error response
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error?.response) return "Can't reach the server. Check that the API is running.";
  const data = error.response.data || {};
  if (data.errors) return Object.values(data.errors).flat()[0];
  return data.message || fallback;
}

export default api;
