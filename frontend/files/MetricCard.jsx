export default function MetricCard({ label, value, change, trend, color, bg, icon }) {
  return (
    <div className="metric-card">
      <div className="metric-icon-wrap" style={{ background: bg }}>
        <MetricIcon name={icon} color={color} />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      <div className={`metric-change ${trend}`}>
        {trend === "up" ? "↑" : "↓"} {change}
      </div>
    </div>
  );
}

function MetricIcon({ name, color }) {
  const icons = {
    users: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="7" cy="6" r="3.5" stroke={color} strokeWidth="1.4" />
        <path d="M1 17c0-3.5 3-6 6-6s6 2.5 6 6" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
        <path d="M13 4a2.5 2.5 0 010 5M15 17c0-2.5-1.5-4.5-2.5-5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    posts: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="3" width="14" height="12" rx="2" stroke={color} strokeWidth="1.4" />
        <path d="M6 3V2h6v1M5 9h8M5 12h5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    meetings: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="4" width="14" height="12" rx="2" stroke={color} strokeWidth="1.4" />
        <path d="M6 2v4M12 2v4M2 9h14" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    matches: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path
          d="M9 2l1.8 4L15 6.7l-3 3 .7 4.3L9 12l-3.7 2 .7-4.3-3-3 4.2-.7L9 2z"
          stroke={color}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };
  return icons[name] ?? null;
}
