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
// otherwise sessionStorage (forgotten when the browser closes)
export const getToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
export const setToken = (token, remember = true) => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (token) (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
};

// The organization being viewed (its slug), remembered between visits
export const getOrgSlug = () => localStorage.getItem(ORG_KEY);
export const setOrgSlug = (slug) => (slug ? localStorage.setItem(ORG_KEY, slug) : localStorage.removeItem(ORG_KEY));

// Send the Sanctum token and the selected org with every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const org = getOrgSlug();
  if (org) config.headers["X-Organization"] = org;
  return config;
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
