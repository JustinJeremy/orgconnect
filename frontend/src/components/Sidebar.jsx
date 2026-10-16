import Icon from "./Icon.jsx";
import Logo from "./Logo.jsx";
import Rings from "./Rings.jsx";
import OrgSwitcher from "./OrgSwitcher.jsx";
import { UserAvatar } from "./Avatars.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "dashboard" },
  { key: "events", label: "Events", icon: "calendar" },
  { key: "hours", label: "Members & Hours", icon: "clock" },
  { key: "tutoring", label: "Peer Tutoring", icon: "book" },
  { key: "announcements", label: "Announcements", icon: "megaphone" },
];

export default function Sidebar({ page, onNavigate, open, onClose, collapsed, onToggleCollapse }) {
  const { user, logout } = useAuth();

  const handleNavigate = (key) => {
    onNavigate(key);
    onClose();
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
          <Logo size={35} subtitle={<OrgSwitcher variant="sidebar" />} onHome={() => handleNavigate("dashboard")} />
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
            <button
              key={item.key}
              type="button"
              className={`nav-item ${page === item.key ? "active" : ""}`}
              onClick={() => handleNavigate(item.key)}
              aria-current={page === item.key ? "page" : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-user">
          <button
            type="button"
            className={`sidebar-user-btn ${page === "profile" ? "active" : ""}`}
            onClick={() => handleNavigate("profile")}
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
          </button>
          <button type="button" className="icon-btn" aria-label="Sign out" onClick={() => logout()}>
            <Icon name="logout" />
          </button>
        </div>
      </aside>
    </>
  );
}
