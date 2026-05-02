import { useNavigate, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  {
    section: "Main",
    items: [
      { label: "Overview",     path: "/dashboard",         icon: "grid",     badge: null },
      { label: "Browse Posts", path: "/posts",             icon: "list",     badge: 24 },
      { label: "My Posts",     path: "/my-posts",          icon: "clock",    badge: null },
      { label: "Meetings",     path: "/meetings",          icon: "calendar", badge: 3 },
    ],
  },
  {
    section: "Admin",
    items: [
      { label: "Users",      path: "/admin/users",  icon: "users",  badge: null },
      { label: "Audit Logs", path: "/admin/logs",   icon: "file",   badge: null },
      { label: "Statistics", path: "/admin/stats",  icon: "bar",    badge: null },
    ],
    adminOnly: true,
  },
];

// Replace with your real auth context
const CURRENT_USER = {
  name: "Zeynep Karabay",
  initials: "ZK",
  role: "Admin",
  isAdmin: true,
};

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();

  return (
    <aside className="sidebar">
      {/* logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon-wrap">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 2v14M2 9h14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="9" cy="9" r="3.5" stroke="#fff" strokeWidth="1.6" />
            </svg>
          </div>
          <div>
            <div className="logo-text">HEALTH AI</div>
            <div className="logo-sub">Pi-thon Dynamics</div>
          </div>
        </div>
      </div>

      {/* nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => {
          if (section.adminOnly && !CURRENT_USER.isAdmin) return null;
          return (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map((item) => (
                <div
                  key={item.path}
                  className={`nav-item${location.pathname === item.path ? " active" : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <NavIcon name={item.icon} />
                  {item.label}
                  {item.badge && (
                    <span className="nav-badge">{item.badge}</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </nav>

      {/* user */}
      <div className="sidebar-user">
        <div className="user-avatar">{CURRENT_USER.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="user-name">{CURRENT_USER.name}</div>
          <div className="user-role">{CURRENT_USER.role}</div>
        </div>
      </div>
    </aside>
  );
}

function NavIcon({ name }) {
  const icons = {
    grid: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" />
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".5" />
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity=".3" />
      </svg>
    ),
    list: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="3" width="13" height="2" rx="1" fill="currentColor" />
        <rect x="1" y="7" width="13" height="2" rx="1" fill="currentColor" opacity=".5" />
        <rect x="1" y="11" width="9" height="2" rx="1" fill="currentColor" opacity=".3" />
      </svg>
    ),
    clock: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3" />
        <path d="M7.5 4.5V7.5l2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    calendar: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" />
        <path d="M5 1v4M10 1v4M1 7h13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    users: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1 14c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M11 3a2 2 0 010 4M13 14c0-2-1-3.5-2-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    file: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M3 2h6l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
        <path d="M9 2v3h3M5 7h5M5 10h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
    bar: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="8" width="3" height="6" rx="1" fill="currentColor" opacity=".5" />
        <rect x="6" y="4" width="3" height="10" rx="1" fill="currentColor" />
        <rect x="11" y="6" width="3" height="8" rx="1" fill="currentColor" opacity=".5" />
      </svg>
    ),
  };
  return icons[name] ?? null;
}
