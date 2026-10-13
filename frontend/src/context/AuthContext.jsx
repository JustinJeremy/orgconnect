import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi, orgsApi } from "../api/services.js";
import { errorMessage, getOrgSlug, getToken, setToken } from "../api/client.js";
import { useOrg } from "./OrgContext.jsx";

// Holds the signed-in user (Laravel Sanctum token auth).
// One account works across orgs; the user's role and membership status are for the selected org,
// so the user is reloaded whenever the org changes. `user.orgSlug` says which org it was loaded for.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { current } = useOrg();
  const orgSlug = current?.slug;
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]); // [{ organizationId, role, position, status }]
  const [checking, setChecking] = useState(() => Boolean(getToken()));
  const [authView, setAuthView] = useState(null); // which form Landing should open after signing out

  const loadAccount = useCallback(async () => {
    const slug = getOrgSlug();
    const [account, mine] = await Promise.all([authApi.me(), orgsApi.mine()]);
    setUser({ ...account, orgSlug: slug });
    setMemberships(mine);
  }, []);

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

  const startSession = async ({ token }) => {
    setToken(token);
    await loadAccount();
  };

  const login = async (email, password) => {
    try {
      await startSession(await authApi.login(email.trim(), password));
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

  const changePassword = async (currentPassword, password, confirmPassword) => {
    try {
      await authApi.changePassword({ currentPassword, password, password_confirmation: confirmPassword });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: errorMessage(error) };
    }
  };

  // Apply to the selected org with the account you're signed in with
  const joinOrg = async () => {
    try {
      await orgsApi.join(orgSlug);
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
        changePassword,
        joinOrg,
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
