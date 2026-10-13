import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { orgsApi } from "../api/services.js";
import { errorMessage, getOrgSlug, setOrgSlug } from "../api/client.js";
import { applyTheme } from "../utils/theme.js";

// Holds the list of organizations and the one being viewed.
// The selected org is sent to the API with every request (X-Organization header).
const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const [organizations, setOrganizations] = useState([]);
  const [slug, setSlug] = useState(getOrgSlug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const selectOrg = useCallback((next) => {
    setOrgSlug(next);
    setSlug(next);
  }, []);

  const loadOrganizations = useCallback(async () => {
    setError("");
    try {
      const list = await orgsApi.list();
      setOrganizations(list);
      // First visit, or the saved org no longer exists: start with the first one
      if (!list.some((o) => o.slug === getOrgSlug()) && list[0]) selectOrg(list[0].slug);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [selectOrg]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const current = organizations.find((o) => o.slug === slug) || null;

  // Recolor the whole app with the org's palette
  useEffect(() => {
    applyTheme(current?.theme);
  }, [current]);

  return (
    <OrgContext.Provider value={{ organizations, current, loading, error, selectOrg, reload: loadOrganizations }}>
      {children}
    </OrgContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrg() {
  return useContext(OrgContext);
}
