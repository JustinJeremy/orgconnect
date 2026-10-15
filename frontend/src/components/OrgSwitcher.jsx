import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon.jsx";
import OrgSwatch from "./OrgSwatch.jsx";
import { useOrg } from "../context/OrgContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Org name with a dropdown to switch organizations.
// Orgs you joined switch instantly; picking another org opens its "join" screen.
//
// variant="sidebar"  white text on the dark sidebar
// variant="light"    dark text on light pages (join screen, landing)
export default function OrgSwitcher({ variant = "light" }) {
  const { organizations, current, selectOrg } = useOrg();
  const { user, memberships } = useAuth();
  const [menuPos, setMenuPos] = useState(null); // null = closed
  const open = Boolean(menuPos);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // The menu is rendered in <body> with position: fixed, so neither the sidebar (overflow: hidden)
  // nor a parent with CSS zoom (sign-in page) can clip or shift it
  const toggle = () => {
    if (open) return setMenuPos(null);
    const rect = buttonRef.current.getBoundingClientRect();
    // 19rem: the menu text is in rem, which grows with the window on desktop
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const width = Math.min(19 * rem, window.innerWidth - 32);
    const left = Math.max(16, Math.min(rect.left - 8, window.innerWidth - width - 16));
    const below = window.innerHeight - rect.bottom - 24;
    const above = rect.top - 24;
    // Open upward when there isn't room below; scroll inside the menu if it still doesn't fit
    setMenuPos(
      below >= 240 || below >= above
        ? { top: rect.bottom + 8, left, width, maxHeight: below }
        : { bottom: window.innerHeight - rect.top + 8, left, width, maxHeight: above }
    );
  };

  // Close when clicking outside, pressing Escape, scrolling or resizing
  useEffect(() => {
    if (!open) return;
    const close = () => setMenuPos(null);
    const onClick = (e) => !ref.current?.contains(e.target) && !menuRef.current?.contains(e.target) && close();
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);

  if (!current) return null;

  const membershipOf = (org) => memberships.find((m) => m.organizationId === org.id && m.status !== "Rejected");
  const joined = user ? organizations.filter(membershipOf) : [];
  const others = organizations.filter((o) => !joined.includes(o));

  const choose = (org) => {
    setMenuPos(null);
    if (org.slug !== current.slug) selectOrg(org.slug);
  };

  const note = (org) => {
    const m = membershipOf(org);
    if (!m) return org.college;
    if (m.status === "Pending") return "Application pending";
    if (m.status === "Inactive") return "Inactive member";
    return m.role === "officer" ? `${m.position} · Officer` : "Member";
  };

  const renderItem = (org) => (
    <li key={org.id}>
      <button
        type="button"
        className={`org-option ${org.slug === current.slug ? "is-current" : ""}`}
        onClick={() => choose(org)}
        aria-current={org.slug === current.slug ? "true" : undefined}
      >
        <OrgSwatch org={org} />
        <span className="org-option-text">
          <span className="org-option-name">{org.name}</span>
          <span className="org-option-note">{note(org)}</span>
        </span>
        {org.slug === current.slug && <Icon name="check" size={16} />}
      </button>
    </li>
  );

  return (
    <span className={`org-switcher org-switcher-${variant}`} ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        className="org-switcher-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Organization: ${current.name}. Switch organization`}
        onClick={toggle}
      >
        <span className="org-switcher-name">{current.name}</span>
        <Icon name="chevronDown" size={14} />
      </button>

      {open && createPortal(
        <div className="org-menu" style={menuPos} ref={menuRef}>
          {joined.length > 0 && (
            <>
              <p className="org-menu-label">Your organizations</p>
              <ul>
                {joined.map(renderItem)}
              </ul>
            </>
          )}
          {others.length > 0 && (
            <>
              <p className="org-menu-label">{user ? "Other organizations" : "Organizations"}</p>
              <ul>
                {others.map(renderItem)}
              </ul>
            </>
          )}
        </div>,
        document.body
      )}
    </span>
  );
}
