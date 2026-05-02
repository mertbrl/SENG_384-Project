import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import MetricCard from "./MetricCard";
import ActivityChart from "./ActivityChart";
import DomainChart from "./DomainChart";
import StatusBreakdown from "./StatusBreakdown";
import RecentActivity from "./RecentActivity";
import "./Dashboard.css";

// ─── mock data (replace with real API calls) ──────────────────────────────────
const METRICS = [
  {
    id: "users",
    label: "Registered Users",
    value: 142,
    change: "+12 this month",
    trend: "up",
    color: "#185FA5",
    bg: "#E6F1FB",
    icon: "users",
  },
  {
    id: "posts",
    label: "Active Posts",
    value: 87,
    change: "+8 this week",
    trend: "up",
    color: "#3B6D11",
    bg: "#EAF3DE",
    icon: "posts",
  },
  {
    id: "meetings",
    label: "Meetings Scheduled",
    value: 34,
    change: "+5 this week",
    trend: "up",
    color: "#3C3489",
    bg: "#EEEDFE",
    icon: "meetings",
  },
  {
    id: "matches",
    label: "Successful Matches",
    value: 21,
    change: "+3 this month",
    trend: "up",
    color: "#854F0B",
    bg: "#FAEEDA",
    icon: "matches",
  },
];

const STATUS_DATA = [
  { label: "Active",           badge: "active",    count: 87,  pct: 60, color: "#639922" },
  { label: "Meeting Scheduled",badge: "scheduled", count: 34,  pct: 23, color: "#378ADD" },
  { label: "Partner Found",    badge: "closed",    count: 21,  pct: 14, color: "#534AB7" },
  { label: "Draft",            badge: "draft",     count: 12,  pct: 8,  color: "#EF9F27" },
  { label: "Expired",          badge: "expired",   count: 7,   pct: 5,  color: "#E24B4A" },
];

const ACTIVITY_DATA = [
  {
    text: "New post published",
    detail: "AI-Assisted Cardiology Diagnosis",
    time: "2 minutes ago",
    role: "Engineer",
    color: "#639922",
  },
  {
    text: "Meeting request accepted",
    detail: "Radiology ML Pipeline",
    time: "18 minutes ago",
    role: "Healthcare Professional",
    color: "#378ADD",
  },
  {
    text: "Partner found",
    detail: "Surgical Robotics Control",
    time: "1 hour ago",
    role: "Engineer",
    color: "#534AB7",
  },
  {
    text: "New user registered",
    detail: "Dr. Ayşe Demir",
    time: "2 hours ago",
    role: "Healthcare Professional",
    color: "#185FA5",
  },
  {
    text: "Post expired",
    detail: "EEG Signal Processing",
    time: "3 hours ago",
    role: "System",
    color: "#E24B4A",
  },
];
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [unread, setUnread] = useState(3);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const fmt = () => {
      const d = new Date();
      setCurrentTime(
        d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );
    };
    fmt();
    const t = setInterval(fmt, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="dash-layout">
      <Sidebar />

      <main className="dash-main">
        {/* ── top bar ── */}
        <div className="dash-topbar">
          <div>
            <h1 className="dash-page-title">Platform Overview</h1>
            <p className="dash-page-sub">{currentTime} — all time statistics</p>
          </div>
          <div className="dash-topbar-right">
            <button
              className="notif-btn"
              onClick={() => setUnread(0)}
              aria-label="Notifications"
            >
              <BellIcon />
              {unread > 0 && (
                <span className="notif-dot" aria-label={`${unread} unread`} />
              )}
            </button>
          </div>
        </div>

        {/* ── metric cards ── */}
        <div className="metrics-grid">
          {METRICS.map((m) => (
            <MetricCard key={m.id} {...m} />
          ))}
        </div>

        {/* ── charts row ── */}
        <div className="charts-row">
          <ActivityChart />
          <DomainChart />
        </div>

        {/* ── bottom row ── */}
        <div className="bottom-row">
          <StatusBreakdown data={STATUS_DATA} />
          <RecentActivity data={ACTIVITY_DATA} />
        </div>
      </main>
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 1a5 5 0 015 5v4l1.5 2H1.5L3 10V6a5 5 0 015-5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M6 13.5a2 2 0 004 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}
