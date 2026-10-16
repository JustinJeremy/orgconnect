import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, orgRequestsApi, orgsApi } from "../api/services.js";
import { errorMessage, getOrgSlug, getToken, setToken } from "../api/client.js";
import { useOrg } from "./OrgContext.jsx";

// Holds the signed-in user (Laravel Sanctum token auth).
// One account works across orgs; the user's role and membership status are for the selected org,
// so the user is reloaded whenever the org changes. `user.orgSlug` says which org it was loaded for.
const AuthContext = createContext(null);
const REGISTER_KEY = "orgconnect_register_org";

export function AuthProvider({ children }) {
  const { current } = useOrg();
  const orgSlug = current?.slug;
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]); // [{ organizationId, role, position, status }]
  const [orgRequests, setOrgRequests] = useState([]); // orgs this user asked to register, newest first
  const [checking, setChecking] = useState(() => Boolean(getToken()));
  const [authView, setAuthView] = useState(null); // which form Landing should open after signing out
  // Signing up / in to register a new org: shows the registration form instead of the org (kept across reloads)
  const [registeringOrg, setRegisteringOrg] = useState(() => {
    try {
      return sessionStorage.getItem(REGISTER_KEY) === "1";
    } catch {
      return false;
    }
  });
  const setRegistering = useCallback((on) => {
    try {
      if (on) sessionStorage.setItem(REGISTER_KEY, "1");
      else sessionStorage.removeItem(REGISTER_KEY);
    } catch {
      /* storage blocked: still works for this visit */
    }
    setRegisteringOrg(on);
  }, []);

  const loadAccount = useCallback(async () => {
    const slug = getOrgSlug();
    const [account, mine, requests] = await Promise.all([authApi.me(), orgsApi.mine(), orgRequestsApi.mine()]);
    setUser({ ...account, orgSlug: slug });
    setMemberships(mine);
    setOrgRequests(requests);
    return { mine, requests };
  }, []);

  const reloadOrgRequests = useCallback(async () => setOrgRequests(await orgRequestsApi.mine()), []);

  // Restore the session on page load, and reload the user after switching orgs
  useEffect(() => {
    if (!orgSlug || !getToken()) return;
    loadAccount()
      .catch(() => {
        setToken(null);
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, [orgSlug, loadAccount]);

  const startSession = async ({ token }, remember = true) => {
    setToken(token, remember);
    const { mine, requests } = await loadAccount();
    // Someone who's only here for their org request sees its status right after signing in
    if (!mine.length && requests.length) setRegistering(true);
  };

  const login = async (email, password, remember = true) => {
    try {
      await startSession(await authApi.login(email.trim(), password, remember), remember);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error, "Incorrect email or password.") };
    }
  };

  // Sign up also creates a membership application to the selected org (server side)
  const register = async (data) => {
    try {
      await startSession(
        await authApi.register({
          name: data.name.trim(),
          studentId: data.studentId.trim(),
          email: data.email.trim(),
          course: data.course,
          yearLevel: data.yearLevel,
          password: data.password,
          password_confirmation: data.confirmPassword,
          registerOrg: registeringOrg, // don't apply to the selected org
        })
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  // Profile & settings page. Both return { ok, message? } like login/register.
  const updateProfile = async (data) => {
    try {
      const updated = await authApi.updateProfile(data);
      setUser((u) => ({ ...updated, orgSlug: u.orgSlug }));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  // Avatar picker: one of the keys in components/Avatars.jsx, or { photo: File } for their own picture
  const setAvatar = async (avatar) => {
    try {
      const updated = avatar?.photo ? await authApi.uploadAvatarPhoto(avatar.photo) : await authApi.setAvatar(avatar);
      setUser((u) => ({ ...updated, orgSlug: u.orgSlug }));
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  const changePassword = async (currentPassword, password, confirmPassword) => {
    try {
      await authApi.changePassword({ currentPassword, password, password_confirmation: confirmPassword });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  // Apply to the selected org with the account you're signed in with (message: optional note to the officers)
  const joinOrg = async (message) => {
    try {
      await orgsApi.join(orgSlug, message || null);
      await loadAccount();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  // Add or change the note to the officers while the application is pending
  const updateApplication = async (message) => {
    try {
      await orgsApi.updateApplication(orgSlug, message || null);
      await loadAccount();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  // Cancel a pending application to the selected org
  const withdrawApplication = async () => {
    try {
      await orgsApi.withdraw(orgSlug);
      await loadAccount();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  // An inactive member asks the officers to make them active again
  const requestReactivation = async (message) => {
    try {
      await orgsApi.requestReactivation(orgSlug, message);
      await loadAccount();
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  // nextView: "signin" | "signup" to open that form right after signing out
  const logout = async (nextView = null) => {
    try {
      await authApi.logout();
    } catch {
      // Sign out locally even if the request fails
    }
    setToken(null);
    setUser(null);
    setMemberships([]);
    setOrgRequests([]);
    setRegistering(false);
    setAuthView(nextView);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        memberships,
        checking,
        login,
        register,
        updateProfile,
        setAvatar,
        changePassword,
        joinOrg,
        registeringOrg,
        orgRequests,
        reloadOrgRequests,
        startOrgRegistration: () => setRegistering(true),
        endOrgRegistration: () => setRegistering(false),
        withdrawApplication,
        updateApplication,
        requestReactivation,
        logout,
        authView,
        clearAuthView: () => setAuthView(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
