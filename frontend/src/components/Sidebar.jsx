import Icon from "./Icon.jsx";
import { isPlainClick, pagePath } from "../hooks/useUrlPage.js";
import { useOrg } from "../context/OrgContext.jsx";
import Logo from "./Logo.jsx";
import Rings from "./Rings.jsx";
import OrgSwitcher from "./OrgSwitcher.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "events", label: "Events", icon: "calendar" },
  { key: "tutoring", label: "Peer Tutoring", icon: "book" },
  { key: "people", label: "People", icon: "users" },
  { key: "messages", label: "Messages", icon: "mail" },
  { key: "hours", label: "Members & Hours", icon: "clock" },
  { key: "announcements", label: "Announcements", icon: "megaphone" },
];

// badges: { [page]: count } shown beside a menu item (e.g. unread messages)
export default function Sidebar({ page, onNavigate, open, onClose, collapsed, onToggleCollapse, badges = {} }) {
  const { user, logout } = useAuth();

  const handleNavigate = (key) => {
    onNavigate(key);
    onClose();
  };
  // Opened in a new tab, a link keeps this tab's org
  const { current } = useOrg();
  const tabLink = (key) => `${pagePath(key)}?org=${current.slug}`;
  // A plain click switches page here; Ctrl/middle-click is left to the browser (new tab)
  const linkClick = (e, key) => {
    if (!isPlainClick(e)) return;
    e.preventDefault();
    handleNavigate(key);
  };

  return (
    <>
      {open && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={onClose}
        />
      )}

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Rings preset="sidebar" />
        <div className="sidebar-brand">
          <Logo size={35} subtitle={<OrgSwitcher variant="sidebar" />} homeHref={tabLink("dashboard")} onHome={() => handleNavigate("dashboard")} />
          <button
            type="button"
            className="icon-btn sidebar-collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggleCollapse}
          >
            <Icon name="sidebar" size={18} />
          </button>
        </div>

        <nav className="nav" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            // Real links: Ctrl/middle-click opens the page in a new tab
            <a
              key={item.key}
              href={tabLink(item.key)}
              className={`nav-item ${page === item.key ? "active" : ""}`}
              onClick={(e) => linkClick(e, item.key)}
              aria-current={page === item.key ? "page" : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              {badges[item.key] > 0 && <span className="nav-count" aria-label={`${badges[item.key]} unread`}>{badges[item.key] > 9 ? "9+" : badges[item.key]}</span>}
            </a>
          ))}
        </nav>

        <div className="sidebar-user">
          <a
            href={tabLink("profile")}
            className={`sidebar-user-btn ${page === "profile" ? "active" : ""}`}
            onClick={(e) => linkClick(e, "profile")}
            aria-current={page === "profile" ? "page" : undefined}
            title="Profile & settings"
          >
            <UserAvatar user={user} />
            <span className="sidebar-user-text">
              <span className="sidebar-user-name">{user.name}</span>
              <span className="sidebar-user-role">
                {user.role === "officer" ? `${user.position} · Officer` : "Member"}
              </span>
            </span>
          </a>
          <button type="button" className="icon-btn" aria-label="Sign out" onClick={() => logout()}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>
    </>
  );
}
