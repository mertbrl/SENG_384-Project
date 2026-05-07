import { useEffect, useId, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import ActivityChart from "./ActivityChart.jsx";
import DomainDonutChart from "./DomainDonutChart.jsx";
import { InterestSlotPlanner } from "./InterestSlotPlanner.jsx";
import NDAModal from "./NDAModal.jsx";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "/api";

const demoAccounts = [
  { role: "Admin", email: "admin@healthai.edu.tr", password: "Admin123!" },
  { role: "Engineer", email: "engineer@itu.edu.tr", password: "Engineer123!" },
  { role: "Healthcare", email: "doctor@hacettepe.edu.tr", password: "Doctor123!" },
];

const emptyPostForm = {
  title: "",
  workingDomain: "",
  requiredExpertise: "",
  projectStage: "idea",
  healthcareNeed: "",
  technicalNeed: "",
  commitmentLevel: "medium",
  collaborationType: "advisor",
  confidentialityLevel: "public",
  country: "Turkey",
  city: "Ankara",
  expiryDate: "",
  autoClose: false,
  shortExplanation: "",
  highLevelIdea: "",
  description: "",
  status: "draft",
};

const emptyProfile = {
  fullName: "",
  institution: "",
  country: "Turkey",
  city: "Ankara",
  expertise: "",
  bio: "",
};

const emptyLoginForm = { email: "", password: "" };
const emptyRegisterForm = {
  fullName: "",
  email: "",
  password: "",
  role: "engineer",
  institution: "",
  country: "Turkey",
  city: "Ankara",
  expertise: "",
  privacyAccepted: false,
};

const emptyFilters = {
  search: "",
  domain: "",
  city: "",
  country: "",
  expertise: "",
  stage: "",
  status: "",
};

const projectStageOptions = [
  { value: "idea", label: "Idea" },
  { value: "concept_validation", label: "Concept validation" },
  { value: "prototype_developed", label: "Prototype developed" },
  { value: "pilot_testing", label: "Pilot testing" },
  { value: "pre_deployment", label: "Pre-deployment" },
];

const collaborationTypeOptions = [
  { value: "advisor", label: "Advisor" },
  { value: "co_founder", label: "Co-founder" },
  { value: "research_partner", label: "Research partner" },
];

const confidentialityLabels = {
  public: "Public — short pitch for discovery",
  nda_required: "NDA path — details only after agreement / meeting",
};

const studioSteps = [
  { title: "Basic info", caption: "Title, domain and location" },
  { title: "Collaboration", caption: "Needs, expertise and stage" },
  { title: "Safety", caption: "Confidentiality and publish settings" },
];

const publishRequiredFields = [
  { key: "title", label: "Title", step: 0 },
  { key: "workingDomain", label: "Working domain", step: 0 },
  { key: "requiredExpertise", label: "Required expertise", step: 0 },
];

function unwrap(payload) {
  if (payload && Object.prototype.hasOwnProperty.call(payload, "data")) {
    return payload.data;
  }
  return payload;
}

function toSentenceCase(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatApiErrorMessageWhenBodyMissing(response) {
  const status = response?.status ?? 0;
  if (!status || status === 502 || status === 503 || status === 504) {
    return "Cannot reach the API. Start the backend (e.g. port 5001), confirm the database is running, and run prisma migrate if needed. Prisma Studio being open or closed does not affect registration.";
  }
  if (status >= 500) {
    return "Server error. Check backend terminal logs, DATABASE_URL in backend/.env, and that Prisma migrations are applied (npm run db:migrate in backend).";
  }
  return "The server returned an error without details. For registration: use an .edu or .edu.tr email, password 8+ characters with one uppercase letter and one number, and fill every field.";
}

function formatApiError(payload, response) {
  if (!payload) {
    return formatApiErrorMessageWhenBodyMissing(response);
  }

  const hasDetails = Array.isArray(payload.details) && payload.details.length > 0;
  const rawMessage = payload.message;
  const hasMessage = typeof rawMessage === "string" && rawMessage.trim().length > 0;
  const isEmptyObject = typeof payload === "object" && !Array.isArray(payload) && Object.keys(payload).length === 0;

  if (!hasMessage && !hasDetails && isEmptyObject) {
    return formatApiErrorMessageWhenBodyMissing(response);
  }

  const baseMessage =
    hasMessage && rawMessage !== "Validation failed."
      ? rawMessage
      : "Please check the highlighted fields and try again.";

  if (!hasDetails) {
    return baseMessage;
  }

  const detailText = payload.details
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const fieldPath = item.path || item.param || "";
      const field = toSentenceCase(fieldPath) || "Field";
      let message = "";
      if (typeof item.msg === "string") message = item.msg.trim();
      else if (item.msg != null) message = String(item.msg).trim();
      if (!message) return "";
      if (fieldPath && message.toLowerCase().includes(String(fieldPath).toLowerCase())) {
        return message;
      }
      return `${field}: ${message}`;
    })
    .filter(Boolean)
    .join(" ");

  return detailText || baseMessage;
}

async function api(path, { method = "GET", body, token, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  const init = { method, headers: requestHeaders };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${path}`, init);
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("text/csv")
    ? await response.text()
    : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(formatApiError(payload, response));
  }

  return typeof payload === "string" ? payload : unwrap(payload);
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

function labelFor(options, value) {
  return options.find((option) => option.value === value)?.label || String(value || "").replaceAll("_", " ");
}

function clampStep(value) {
  return Math.max(0, Math.min(studioSteps.length - 1, value));
}

function validateRegisterForm(registerForm) {
  if (!registerForm.fullName?.trim()) return "Full name is required.";
  if (!registerForm.email?.trim()) return "Institutional email is required.";
  if (!registerForm.password?.trim()) return "Password is required.";
  if (!registerForm.institution?.trim()) return "Institution is required.";
  if (!registerForm.country?.trim()) return "Country is required.";
  if (!registerForm.city?.trim()) return "City is required.";
  if (!registerForm.expertise?.trim()) return "Expertise is required.";
  if (!registerForm.privacyAccepted) {
    return "Please agree to the Health AI Terms of Service and Privacy Policy to create an account.";
  }
  return "";
}

function getMissingPublishFields(postForm) {
  return publishRequiredFields.filter((field) => !String(postForm[field.key] || "").trim());
}

/**
 * Match score for the signed-in viewer (not NLP on title text).
 * Same city +30, same country +15, complementary owner role vs viewer +40,
 * viewer expertise contains post domain or required expertise +15 (max 100).
 */
function computeMatchInsight(post, viewer) {
  if (!post || !viewer) {
    return { score: 0, lines: [], cityMatch: false, isOwnPost: false };
  }
  const isOwnPost = post.userId === viewer.id;
  const lines = [];
  let score = 0;

  const cityOk =
    Boolean(post.city && viewer.city) &&
    String(post.city).trim().toLowerCase() === String(viewer.city).trim().toLowerCase();
  if (cityOk) {
    score += 30;
    lines.push("Same city as you (+30)");
  }

  const countryOk =
    Boolean(post.country && viewer.country) &&
    String(post.country).trim().toLowerCase() === String(viewer.country).trim().toLowerCase();
  if (countryOk) {
    score += 15;
    lines.push("Same country (+15)");
  }

  const ownerRole = post.owner?.role;
  const roleOk = ownerRole && ownerRole !== viewer.role;
  if (roleOk) {
    score += 40;
    lines.push("Different role than post owner — co-creation fit (+40)");
  }

  const expertise = String(viewer.expertise || "").toLowerCase();
  const domain = String(post.workingDomain || "").toLowerCase();
  const required = String(post.requiredExpertise || "").toLowerCase();
  const domainOk =
    (domain && expertise.includes(domain)) || (required && expertise.includes(required));
  if (domainOk) {
    score += 15;
    lines.push("Your profile expertise overlaps domain or required skills (+15)");
  }

  if (!lines.length) {
    lines.push("No location or expertise overlap yet — refine filters or your profile.");
  }

  if (isOwnPost) {
    lines.unshift("Your announcement — score shows what a peer in your region would see.");
  }

  return {
    score: Math.min(score, 100),
    lines,
    cityMatch: cityOk,
    isOwnPost,
  };
}

const ADMIN_DOMAIN_COLORS = ["#2563eb", "#06b6d4", "#8b5cf6", "#f97316", "#22c55e"];

function domainDonutModel(entries) {
  const list = entries.length ? entries : [["Other", 1]];
  const total = list.reduce((sum, [, c]) => sum + Number(c || 0), 0) || 1;
  let acc = 0;
  const segments = list.map(([domain, count], i) => {
    const n = Number(count || 0);
    const slice = (n / total) * 360;
    const from = acc;
    const to = acc + slice;
    acc = to;
    return {
      domain,
      count: n,
      from,
      to,
      pct: total ? Math.round((n / total) * 100) : 0,
      color: ADMIN_DOMAIN_COLORS[i % ADMIN_DOMAIN_COLORS.length],
    };
  });
  const gradient = `conic-gradient(${segments.map((s) => `${s.color} ${s.from}deg ${s.to}deg`).join(", ")})`;
  return { segments, gradient, total };
}

/** Wide viewBox so the chart fills horizontal panels (square viewBox + meet caused a tiny square). */
function adminTrendChartModel(values, labels) {
  const vals = values.length ? values : [0];
  const maxRaw = Math.max(...vals, 1);
  const n = vals.length;
  const vbW = 400;
  const vbH = 100;
  const padL = 20;
  const padR = 12;
  const padT = 10;
  const padB = 22;
  const innerW = vbW - padL - padR;
  const innerH = vbH - padT - padB;
  const pts = vals.map((v, i) => {
    const x = n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW;
    const vn = Math.max(Number(v) || 0, 0);
    const yNorm = maxRaw > 0 ? vn / maxRaw : 0;
    const y = padT + innerH - yNorm * innerH;
    return { x, y, v: vn, label: labels[i] || "" };
  });
  const linePoints = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const baseY = padT + innerH;
  let areaD = `M ${pts[0].x} ${baseY}`;
  pts.forEach((p) => {
    areaD += ` L ${p.x} ${p.y}`;
  });
  areaD += ` L ${pts[n - 1].x} ${baseY} Z`;
  const gridYs = [0, 0.33, 0.66, 1].map((t) => padT + innerH - t * innerH);
  return { pts, linePoints, areaD, gridYs, padL, padR, vbW, vbH, max: maxRaw };
}

function formatDate(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function formatDateShort(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Treats each scheduled slot as a 1h window after `selectedSlot` start; UI-only (DB status unchanged). */
const MEETING_SLOT_WINDOW_MS = 60 * 60 * 1000;

function isMeetingSlotMissed(meeting) {
  if (meeting.status !== "scheduled") return false;
  if (!meeting.selectedSlot) return false;
  const start = new Date(meeting.selectedSlot).getTime();
  if (Number.isNaN(start)) return false;
  return Date.now() > start + MEETING_SLOT_WINDOW_MS;
}

function confidentialityLabel(value) {
  if (!value) return "—";
  return confidentialityLabels[value] || String(value).replaceAll("_", " ");
}

function createdSince(records, getDate, msAgo) {
  if (!records?.length) return 0;
  const cutoff = Date.now() - msAgo;
  return records.filter((r) => {
    const t = new Date(getDate(r)).getTime();
    return !Number.isNaN(t) && t >= cutoff;
  }).length;
}

function userInitials(fullName) {
  if (!fullName?.trim()) return "?";
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{String(status).replaceAll("_", " ")}</span>;
}

function interestFlowHint(status) {
  if (status === "pending") {
    return "Waiting for the post owner to propose time slots. Continue in Interests.";
  }
  if (status === "acknowledged") {
    return "The owner proposed times — open Interests to pick a slot and send a meeting request.";
  }
  if (status === "meeting_requested") {
    return "Meeting request sent. Open Meetings to accept or confirm a slot.";
  }
  return "Continue in Interests.";
}

function StatCard({ label, value, hint }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function OverviewStatCard({ icon, label, value, sub }) {
  return (
    <article className="dash-stat-card">
      <div className="dash-stat-icon-wrap" aria-hidden>
        {icon}
      </div>
      <div className="dash-stat-copy">
        <span className="dash-stat-label">{label}</span>
        <strong className="dash-stat-value">{value}</strong>
        {sub ? <span className="dash-stat-sub">{sub}</span> : null}
      </div>
    </article>
  );
}

function PostStatusPanel({ rows }) {
  return (
    <div className="dash-card dash-card--compact">
      <div className="card-header">
        <div className="card-title">Post status breakdown</div>
      </div>
      <ul className="dash-status-list">
        {rows.map((row) => (
          <li key={row.key}>
            <span className="dash-status-name">{row.label}</span>
            <span className={`dash-status-pill tone-${row.tone}`}>{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecentActivityPanel({ items }) {
  return (
    <div className="dash-card dash-card--compact">
      <div className="card-header">
        <div>
          <div className="card-title">Recent activity</div>
          <div className="card-sub">Latest platform events</div>
        </div>
      </div>
      <ul className="dash-activity-list">
        {items.length ? (
          items.map((item, i) => (
            <li key={`${item.title}-${i}`}>
              <span className={`dash-activity-dot ${item.tone === "bad" ? "is-bad" : item.tone === "ok" ? "is-ok" : "is-muted"}`} aria-hidden />
              <div>
                <div className="dash-activity-title">{item.title}</div>
                <div className="dash-activity-meta">{item.meta}</div>
              </div>
            </li>
          ))
        ) : (
          <li className="dash-activity-empty">No recent events in this view.</li>
        )}
      </ul>
    </div>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty-state">
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="auth-field auth-field--plain">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="wide">
      {label}
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="auth-field auth-field--plain">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function AuthField({ label, value, onChange, type = "text", placeholder = "", icon = "" }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      <div className="auth-input-wrap">
        <span className="auth-input-icon" aria-hidden="true">{icon}</span>
        <input autoComplete="off" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [view, setView] = useState("login");
  const [activeTab, setActiveTab] = useState("feed");
  const [feedSection, setFeedSection] = useState("overview");
  const [locations, setLocations] = useState([]);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [editingPostId, setEditingPostId] = useState(null);
  const [composerStep, setComposerStep] = useState(0);
  const [interests, setInterests] = useState([]);
  const [interestDraft, setInterestDraft] = useState({ message: "" });
  const [showNdaModal, setShowNdaModal] = useState(false);
  const [ndaAcceptedForInterest, setNdaAcceptedForInterest] = useState(false);
  const [interestSelections, setInterestSelections] = useState({});
  const [interestMeetingDrafts, setInterestMeetingDrafts] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [meetingJoinDrafts, setMeetingJoinDrafts] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileForm, setProfileForm] = useState(emptyProfile);
  const [publishValidationModal, setPublishValidationModal] = useState([]);
  const [adminOverview, setAdminOverview] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminPosts, setAdminPosts] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminAnomalies, setAdminAnomalies] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authInlineError, setAuthInlineError] = useState("");
  const [registerInlineError, setRegisterInlineError] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("healthai-dark") === "1"; } catch { return false; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    try { localStorage.setItem("healthai-dark", darkMode ? "1" : "0"); } catch { /* noop */ }
  }, [darkMode]);

  const token = session?.token || "";
  const user = session?.user || null;
  const adminTrendChartId = useId().replaceAll(":", "");

  const cityOptions = useMemo(() => {
    const selectedCountry = locations.find((country) => country.name === (postForm.country || profileForm.country || registerForm.country));
    return selectedCountry?.cities || locations.flatMap((country) => country.cities || []);
  }, [locations, postForm.country, profileForm.country, registerForm.country]);

  const countryOptions = useMemo(
    () => locations.map((country) => ({ value: country.name, label: country.name })),
    [locations]
  );

  const citySelectOptions = useMemo(
    () => cityOptions.map((city) => ({ value: city.name, label: city.name })),
    [cityOptions]
  );

  const scoredPosts = useMemo(
    () =>
      posts.map((post) => {
        const insight = computeMatchInsight(post, user);
        return {
          ...post,
          healthAiMatchScore: insight.score,
          matchScoreLines: insight.lines,
          cityMatch: insight.cityMatch,
          matchIsOwnPost: insight.isOwnPost,
        };
      }),
    [posts, user]
  );

  const ownScoredPosts = useMemo(
    () => scoredPosts.filter((post) => post.userId === user?.id),
    [scoredPosts, user]
  );

  const otherScoredPosts = useMemo(
    () => scoredPosts.filter((post) => post.userId !== user?.id),
    [scoredPosts, user]
  );

  const orderedScoredPosts = useMemo(
    () => [...ownScoredPosts, ...otherScoredPosts],
    [ownScoredPosts, otherScoredPosts]
  );

  const stats = useMemo(() => {
    const activePosts = posts.filter((post) => post.status === "active").length;
    const ownPosts = user ? posts.filter((post) => post.userId === user.id).length : 0;
    const activeInterests = interests.filter((interest) => interest.status !== "withdrawn").length;
    const pendingMeetings = meetings.filter((meeting) => meeting.status === "pending").length;
    return { activePosts, ownPosts, activeInterests, pendingMeetings };
  }, [posts, interests, meetings, user]);

  const domainDistribution = useMemo(() => {
    const countMap = {};
    posts.forEach((post) => {
      const key = post.workingDomain || "Other";
      countMap[key] = (countMap[key] || 0) + 1;
    });
    return Object.entries(countMap).slice(0, 5);
  }, [posts]);

  const overviewDateLabel = useMemo(
    () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    []
  );

  const postsCreatedWeek = useMemo(() => createdSince(posts, (p) => p.createdAt, 7 * 86400000), [posts]);
  const postsCreatedMonth = useMemo(() => createdSince(posts, (p) => p.createdAt, 30 * 86400000), [posts]);
  const interestsMonth = useMemo(() => createdSince(interests, (i) => i.createdAt, 30 * 86400000), [interests]);
  const meetingsWeek = useMemo(() => createdSince(meetings, (m) => m.createdAt, 7 * 86400000), [meetings]);

  const postStatusRows = useMemo(() => {
    if (user?.role === "admin" && adminStats?.postsByStatus?.length) {
      const toneFor = (s) => {
        if (s === "active") return "active";
        if (s === "partner_found") return "closed";
        if (s === "meeting_scheduled") return "meet";
        return "neutral";
      };
      return adminStats.postsByStatus.map((item) => ({
        key: item.status,
        label: String(item.status).replaceAll("_", " "),
        count: item._count.status,
        tone: toneFor(item.status),
      }));
    }
    const order = ["active", "meeting_scheduled", "partner_found", "draft", "expired"];
    const labels = {
      active: "Active",
      meeting_scheduled: "Meeting scheduled",
      partner_found: "Partner found",
      draft: "Draft",
      expired: "Expired",
    };
    const counts = {};
    posts.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return order
      .filter((k) => counts[k])
      .map((k) => ({
        key: k,
        label: labels[k] || k,
        count: counts[k],
        tone: k === "active" ? "active" : k === "partner_found" ? "closed" : k === "meeting_scheduled" ? "meet" : "neutral",
      }));
  }, [user?.role, adminStats, posts]);

  const recentActivityItems = useMemo(() => {
    if (user?.role === "admin" && adminLogs.length) {
      return adminLogs.slice(0, 8).map((log) => ({
        title: String(log.actionType || "").replaceAll("_", " "),
        meta: `${log.role} · ${formatDate(log.timestamp)}`,
        tone: log.resultStatus === "failure" ? "bad" : "ok",
      }));
    }
    return (notifications || []).slice(0, 8).map((n) => ({
      title: n.message,
      meta: formatDate(n.createdAt),
      tone: n.read ? "neutral" : "ok",
    }));
  }, [user?.role, adminLogs, notifications]);

  useEffect(() => {
    api("/locations")
      .then(setLocations)
      .catch((caughtError) => setError(caughtError.message));
  }, []);

  useEffect(() => {
    localStorage.removeItem("health-ai-session");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get("verified");
    const verifyError = params.get("error");
    if (verified === "1") {
      setView("login");
      setMessage("Email verified successfully. You can now sign in.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (verified === "0" && verifyError) {
      setView("login");
      setAuthInlineError(verifyError);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!resendCountdown) return undefined;
    const timer = window.setInterval(() => {
      setResendCountdown((current) => (current > 1 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (message) {
      toast.success(message, { duration: 3000 });
      setMessage("");
    }
  }, [message]);

  useEffect(() => {
    if (error) {
      if (!user && view === "login") {
        setAuthInlineError(error);
        setError("");
        return;
      }
      if (!user && view === "register") {
        setRegisterInlineError(error);
        setError("");
        return;
      }
      toast.error(error, { duration: 3000 });
      setError("");
    }
  }, [error, user, view]);

  useEffect(() => {
    if (token) {
      refreshAll();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      refreshPosts();
    }
  }, [filters]);

  useEffect(() => {
    if (activeTab !== "feed" || feedSection !== "browse") {
      setSelectedPost(null);
    }
  }, [activeTab, feedSection]);

  useEffect(() => {
    if (!selectedPost || activeTab !== "feed" || feedSection !== "browse") return undefined;
    function onKeyDown(event) {
      if (event.key === "Escape") setSelectedPost(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedPost, activeTab, feedSection]);

  async function authorized(path, options = {}) {
    return api(path, { ...options, token });
  }

  async function refreshPosts() {
    const query = buildQuery(filters);
    const result = await authorized(`/posts${query ? `?${query}` : ""}`);
    setPosts(result.posts || []);
  }

  async function refreshAll() {
    if (!token) return;
    try {
      const [me, postResult, interestResult, meetingResult, notificationResult, unreadResult, profileResult] = await Promise.all([
        authorized("/auth/me"),
        authorized(`/posts${buildQuery(filters) ? `?${buildQuery(filters)}` : ""}`),
        authorized("/interests"),
        authorized("/meetings"),
        authorized("/notifications"),
        authorized("/notifications/unread-count"),
        authorized("/users/me"),
      ]);
      setSession((current) => (current ? { ...current, user: me } : current));
      setPosts(postResult.posts || []);
      setInterests(interestResult || []);
      setMeetings(meetingResult || []);
      setNotifications(notificationResult || []);
      setUnreadCount(unreadResult.count || 0);
      setProfileForm({
        fullName: profileResult.fullName || "",
        institution: profileResult.institution || "",
        country: profileResult.country || "Turkey",
        city: profileResult.city || "Ankara",
        expertise: profileResult.expertise || "",
        bio: profileResult.bio || "",
      });
      if (me.role === "admin") {
        const [overview, users, adminPostResult, logs, adminStatResult, anomalyResult] = await Promise.all([
          authorized("/admin/overview"),
          authorized("/admin/users"),
          authorized("/admin/posts"),
          authorized("/admin/logs"),
          authorized("/admin/stats"),
          authorized("/admin/logs/anomalies"),
        ]);
        setAdminOverview(overview);
        setAdminUsers(users || []);
        setAdminPosts(adminPostResult || []);
        setAdminLogs(logs || []);
        setAdminStats(adminStatResult);
        setAdminAnomalies(anomalyResult);
      }
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthInlineError("");
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/auth/login", { method: "POST", body: loginForm });
      setSession(result);
      setActiveTab("feed");
      setFeedSection("overview");
      setMessage("Welcome back to Health AI.");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setRegisterInlineError("");
    const registerValidationMessage = validateRegisterForm(registerForm);
    if (registerValidationMessage) {
      setRegisterInlineError(registerValidationMessage);
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { privacyAccepted: _privacyAccepted, ...registerPayload } = registerForm;
      const result = await api("/auth/register", { method: "POST", body: registerPayload });
      setResendCountdown(60);
      setView("verify");
      setMessage(result.message || "Account created. Please check your email for the verification link.");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    if (resendCountdown > 0) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/auth/resend-verification", {
        method: "POST",
        body: { email: registerForm.email },
      });
      setResendCountdown(60);
      setMessage(result.message || "A new verification email was sent.");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      if (token) await authorized("/auth/logout", { method: "POST" });
    } catch {
      setMessage("");
    }
    setSession(null);
    setView("login");
    setActiveTab("feed");
    setSelectedPost(null);
    setEditingPostId(null);
    setLoginForm(emptyLoginForm);
    setRegisterForm(emptyRegisterForm);
    setResendCountdown(0);
    setAuthInlineError("");
    setRegisterInlineError("");
  }

  function resetComposer() {
    setEditingPostId(null);
    setComposerStep(0);
    setPostForm({
      ...emptyPostForm,
      country: user?.country || "Turkey",
      city: user?.city || "Ankara",
    });
  }

  function editPost(post) {
    setEditingPostId(post.id);
    setComposerStep(0);
    setPostForm({
      title: post.title || "",
      workingDomain: post.workingDomain || "",
      requiredExpertise: post.requiredExpertise || "",
      projectStage: post.projectStage || "idea",
      healthcareNeed: post.healthcareNeed || "",
      technicalNeed: post.technicalNeed || "",
      commitmentLevel: post.commitmentLevel || "medium",
      collaborationType: post.collaborationType || "advisor",
      confidentialityLevel: post.confidentialityLevel || "public",
      country: post.country || "Turkey",
      city: post.city || "Ankara",
      expiryDate: post.expiryDate ? post.expiryDate.slice(0, 10) : "",
      autoClose: Boolean(post.autoClose),
      shortExplanation: post.shortExplanation || "",
      highLevelIdea: post.highLevelIdea || "",
      description: post.description || "",
      status: post.status || "draft",
    });
    setActiveTab("composer");
  }

  async function savePost(nextStatus) {
    const missingFields = nextStatus === "active" ? getMissingPublishFields(postForm) : [];
    if (missingFields.length) {
      setPublishValidationModal(missingFields);
      setComposerStep(missingFields[0].step);
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const payload = { ...postForm, status: nextStatus };
      if (editingPostId) {
        await authorized(`/posts/${editingPostId}`, { method: "PUT", body: payload });
        setMessage("Post updated.");
      } else {
        await authorized("/posts", { method: "POST", body: payload });
        setMessage(nextStatus === "active" ? "Post published." : "Draft saved.");
      }
      resetComposer();
      setActiveTab("feed");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function updatePostStatus(postId, status) {
    setError("");
    setMessage("");
    try {
      await authorized(`/posts/${postId}/status`, { method: "PATCH", body: { status } });
      setMessage(`Post status changed to ${status}.`);
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function deletePost(postId) {
    setError("");
    setMessage("");
    try {
      await authorized(`/posts/${postId}`, { method: "DELETE" });
      setSelectedPost(null);
      setMessage("Post deleted.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function expressInterest({ message, ndaAccepted }) {
    if (!selectedPost) return;
    if (!String(message || "").trim()) {
      setError("Please add a short first-contact message.");
      return;
    }
    if (!ndaAccepted) {
      setError("Please accept the NDA terms to continue.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await authorized(`/posts/${selectedPost.id}/interests`, {
        method: "POST",
        body: { message: String(message).trim() },
      });
      setInterestDraft({ message: "" });
      setShowNdaModal(false);
      setActiveTab("interests");
      setMessage("Interest expressed. The post owner can now propose time slots.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function proposeInterestSlots(interest, proposedSlots) {
    setError("");
    setMessage("");
    try {
      await authorized(`/interests/${interest.id}/time-slots`, {
        method: "POST",
        body: { proposedSlots },
      });
      setMessage("Time slots proposed.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
      throw caughtError;
    }
  }

  async function withdrawInterest(interest) {
    setError("");
    setMessage("");
    try {
      await authorized(`/interests/${interest.id}/withdraw`, { method: "PATCH" });
      setMessage("Interest withdrawn.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function reinstateInterest(interest) {
    setError("");
    setMessage("");
    try {
      await authorized(`/interests/${interest.id}/reinstate`, { method: "PATCH" });
      setMessage("Interest reinstated. Proposed times were cleared; the owner can propose new slots.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function requestMeetingFromInterest(interest) {
    setError("");
    setMessage("");
    const draft = interestMeetingDrafts[interest.id] || {};
    if (!draft.ndaAccepted) {
      setError("Please accept the NDA and first-contact terms before sending a meeting request.");
      return;
    }
    try {
      const slotId = interestSelections[interest.id] || interest.timeSlots?.[0]?.id;
      await authorized(`/interests/${interest.id}/meeting-request`, {
        method: "POST",
        body: {
          slotId,
          ndaAccepted: Boolean(draft.ndaAccepted),
          message: draft.message || "",
        },
      });
      setInterestMeetingDrafts((current) => ({ ...current, [interest.id]: { message: "", ndaAccepted: false } }));
      setMessage("Meeting request sent to the post owner.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function meetingAction(meeting, action) {
    setError("");
    setMessage("");
    try {
      const updated = await authorized(`/meetings/${meeting.id}/${action}`, { method: "PATCH" });
      setMessage(updated.status === "scheduled" ? "Meeting scheduled." : `Meeting ${action} completed.`);
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function confirmSlot(meeting, slotId) {
    setError("");
    setMessage("");
    try {
      await authorized(`/meetings/${meeting.id}/time-slots/${slotId}/confirm`, { method: "PATCH" });
      setMessage("Meeting slot confirmed.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function saveMeetingJoinUrl(meeting) {
    setError("");
    setMessage("");
    const raw = meetingJoinDrafts[meeting.id] !== undefined ? meetingJoinDrafts[meeting.id] : meeting.joinUrl || "";
    try {
      await authorized(`/meetings/${meeting.id}/join-url`, {
        method: "PATCH",
        body: { joinUrl: String(raw).trim() },
      });
      setMeetingJoinDrafts((current) => {
        const next = { ...current };
        delete next[meeting.id];
        return next;
      });
      setMessage("Video meeting link saved.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function clearMeetingJoinUrl(meeting) {
    setError("");
    setMessage("");
    try {
      await authorized(`/meetings/${meeting.id}/join-url`, { method: "PATCH", body: { joinUrl: "" } });
      setMeetingJoinDrafts((current) => ({ ...current, [meeting.id]: "" }));
      setMessage("Video meeting link removed.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const updated = await authorized("/users/me", { method: "PUT", body: profileForm });
      setSession((current) => ({ ...current, user: { ...current.user, ...updated } }));
      setMessage("Profile updated.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function exportMyData() {
    setError("");
    setMessage("");
    try {
      const data = await authorized("/users/export");
      downloadFile("health-ai-data-export.json", JSON.stringify(data, null, 2), "application/json");
      setMessage("Data export prepared.");
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function deleteAccount() {
    if (!window.confirm("Delete your account and related demo data?")) return;
    setError("");
    try {
      await authorized("/users/me", { method: "DELETE" });
      await logout();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function readAllNotifications() {
    setError("");
    try {
      await authorized("/notifications/read-all", { method: "PATCH" });
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function deleteNotification(id) {
    setError("");
    try {
      await authorized(`/notifications/${id}`, { method: "DELETE" });
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function suspendUser(id, suspended) {
    setError("");
    try {
      await authorized(`/admin/users/${id}/suspend`, { method: "PATCH", body: { suspended } });
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function removePostAsAdmin(id) {
    setError("");
    try {
      await authorized(`/admin/posts/${id}`, { method: "DELETE" });
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function adminPostStatus(id, status) {
    setError("");
    try {
      await authorized(`/admin/posts/${id}/status`, { method: "PATCH", body: { status } });
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function exportLogs() {
    setError("");
    try {
      const csv = await authorized("/admin/logs/export");
      downloadFile("health-ai-audit-logs.csv", csv, "text/csv");
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  if (!user) {
    return (
      <main className="auth-shell auth-redesign">
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3200,
            style: {
              maxWidth: "560px",
              background: "rgba(9, 52, 89, 0.94)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.26)",
              borderRadius: "12px",
            },
          }}
        />
        <section className="auth-visual">
          <div className="visual-overlay-text">
            <h1>🔬 HEALTH AI Co-Creation Platform</h1>
            <p className="visual-overlay-lead">Engineers meet Clinicians.</p>
            <p className="visual-overlay-lead">Build healthcare's future together.</p>
          </div>
        </section>

        <section className="auth-panel clean-auth-panel">
          {/* Dark mode toggle — top right corner */}
          <button
            type="button"
            className="auth-theme-toggle auth-theme-toggle--corner"
            onClick={() => {
              const isDark = document.documentElement.classList.toggle("dark");
              localStorage.setItem("theme", isDark ? "dark" : "light");
            }}
            title="Toggle dark mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          <div className="auth-panel-stack">
          {view === "login" && (
            <form className="form-stack auth-form" onSubmit={handleLogin} autoComplete="off">
              <small className="auth-brand-label">Pi-thon Dynamics</small>
              <h2>Welcome to Health AI</h2>
              <p className="auth-subtitle">Sign in to continue</p>
              <AuthField
                label="Email"
                icon="✉"
                value={loginForm.email}
                placeholder="you@institution.edu"
                onChange={(email) => {
                  setAuthInlineError("");
                  setLoginForm({ ...loginForm, email });
                }}
              />
              <AuthField
                label="Password"
                type="password"
                icon="🔒"
                value={loginForm.password}
                placeholder="Enter your password"
                onChange={(password) => {
                  setAuthInlineError("");
                  setLoginForm({ ...loginForm, password });
                }}
              />
              {authInlineError && <p className="auth-inline-error" role="alert">{authInlineError}</p>}
              <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
              <p className="switch-link">
                New here? <button type="button" className="text-link" onClick={() => setView("register")}>Create an account</button>
              </p>
              {/* Demo quick-login buttons */}
              <div className="demo-credentials">
                <p className="demo-credentials-label">Quick Demo Login</p>
                <div className="demo-quick-btns">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      className="demo-quick-btn"
                      onClick={() => {
                        setLoginForm({ email: account.email, password: account.password });
                        setAuthInlineError("");
                      }}
                    >
                      <span className="demo-quick-role">{account.role}</span>
                      <span className="demo-quick-email">{account.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {view === "register" && (
            <form className="form-stack auth-form" onSubmit={handleRegister} autoComplete="off">
              <h2>Create your account</h2>
              <p className="auth-subtitle">Join Health AI in a minute</p>
              <div className="form-grid">
                <AuthField label="Full name" icon="👤" value={registerForm.fullName} onChange={(fullName) => { setRegisterInlineError(""); setRegisterForm({ ...registerForm, fullName }); }} />
                <SelectField label="Role" value={registerForm.role} onChange={(role) => { setRegisterInlineError(""); setRegisterForm({ ...registerForm, role }); }} options={[{ value: "engineer", label: "Engineer" }, { value: "healthcare", label: "Healthcare professional" }]} />
                <AuthField label="Institutional email" icon="✉" value={registerForm.email} onChange={(email) => { setRegisterInlineError(""); setRegisterForm({ ...registerForm, email }); }} />
                <AuthField label="Password" type="password" icon="🔒" value={registerForm.password} onChange={(password) => { setRegisterInlineError(""); setRegisterForm({ ...registerForm, password }); }} />
                <Field label="Institution" value={registerForm.institution} onChange={(institution) => { setRegisterInlineError(""); setRegisterForm({ ...registerForm, institution }); }} />
                <SelectField label="Country" value={registerForm.country} onChange={(country) => { setRegisterInlineError(""); setRegisterForm({ ...registerForm, country }); }} options={countryOptions.length ? countryOptions : [{ value: "Turkey", label: "Turkey" }]} />
                <SelectField label="City" value={registerForm.city} onChange={(city) => { setRegisterInlineError(""); setRegisterForm({ ...registerForm, city }); }} options={citySelectOptions.length ? citySelectOptions : [{ value: "Ankara", label: "Ankara" }]} />
                <Field label="Expertise" value={registerForm.expertise} onChange={(expertise) => { setRegisterInlineError(""); setRegisterForm({ ...registerForm, expertise }); }} />
              </div>
              <label className="privacy-check auth-legal-check">
                <input
                  type="checkbox"
                  checked={registerForm.privacyAccepted}
                  onChange={(event) => {
                    setRegisterInlineError("");
                    setRegisterForm({ ...registerForm, privacyAccepted: event.target.checked });
                  }}
                />
                <span>
                  I agree to the Health AI{" "}
                  <a className="text-link" href="/privacy.html#terms-of-service" target="_blank" rel="noopener noreferrer">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a className="text-link" href="/privacy.html#introduction" target="_blank" rel="noopener noreferrer">
                    Privacy Policy
                  </a>
                  .
                </span>
              </label>
              {registerInlineError && <p className="auth-inline-error" role="alert">{registerInlineError}</p>}
              <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
              <p className="switch-link">
                Already a Member? <button type="button" className="text-link" onClick={() => setView("login")}>Log In</button>
              </p>
            </form>
          )}

          {view === "verify" && (
            <div className="form-stack auth-form">
              <h2>Verify your email</h2>
              <p>
                We sent a verification link to <strong>{registerForm.email}</strong>. Open the email and click the link to
                activate your account.
              </p>
              <p className="auth-subtitle">
                You do not need to copy a token manually. Once verification succeeds, we will bring you back to sign in.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={resendVerification}
                  disabled={loading || !registerForm.email || resendCountdown > 0}
                >
                  {resendCountdown > 0 ? `Resend email in ${resendCountdown}s` : "Resend verification email"}
                </button>
              </div>
              <p className="switch-link">
                Back to <button type="button" className="text-link" onClick={() => setView("login")}>Sign In</button>
              </p>
            </div>
          )}
          </div>
        </section>
      </main>
    );
  }

  const adminMeetingsTotal = adminOverview
    ? (adminOverview.pendingMeetings || 0) + (adminOverview.scheduledMeetings || 0)
    : 0;

  return (
    <main className="app-shell dash-theme">
      <aside className="sidebar dash-sidebar">
        <div className="dash-brand">
          <div className="dash-brand-mark" aria-hidden>
            {/* Health AI pulse icon */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M2 12h4l2.5-7 3 14 3-9 2 4 1.5-2H22"
                stroke="rgba(255,255,255,0.92)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <p className="dash-brand-title">HEALTH AI</p>
            <p className="dash-brand-sub">Pi-thon Dynamics</p>
          </div>
        </div>

        <nav className="sidebar-nav dash-sidebar-nav">
          <p className="nav-group-label">Main</p>
          <button
            type="button"
            className={`nav-link${activeTab === "feed" && feedSection === "overview" ? " active" : ""}`}
            onClick={() => {
              setActiveTab("feed");
              setFeedSection("overview");
            }}
          >
            Overview
          </button>
          <button
            type="button"
            className={`nav-link${activeTab === "feed" && feedSection === "browse" ? " active" : ""}`}
            onClick={() => {
              setActiveTab("feed");
              setFeedSection("browse");
            }}
          >
            Browse posts
            <span className="nav-badge">{posts.length}</span>
          </button>
          <button type="button" className={`nav-link${activeTab === "interests" ? " active" : ""}`} onClick={() => setActiveTab("interests")}>Interests</button>
          <button type="button" className={`nav-link${activeTab === "composer" ? " active" : ""}`} onClick={() => setActiveTab("composer")}>Announcement studio</button>
          <button type="button" className={`nav-link${activeTab === "meetings" ? " active" : ""}`} onClick={() => setActiveTab("meetings")}>
            Meetings
            {stats.pendingMeetings > 0 ? <span className="nav-badge">{stats.pendingMeetings}</span> : null}
          </button>

          {user.role === "admin" && (
            <>
              <p className="nav-group-label">Admin</p>
              <button type="button" className={`nav-link${activeTab === "admin" ? " active" : ""}`} onClick={() => setActiveTab("admin")}>Users, posts &amp; audit logs</button>
            </>
          )}
        </nav>

        <div className="sidebar-footer dash-sidebar-footer">
          <button type="button" className="ghost-button" onClick={logout}>Logout</button>
          <small>{user.city}, {user.country}</small>
        </div>
      </aside>

      <section className="content dash-content">
        <div className="dash-content-user-bar" role="region" aria-label="Signed-in account">
          <div className="dash-content-user-main">
            <div className="dash-user-avatar dash-user-avatar--content" aria-hidden>
              {userInitials(user.fullName)}
            </div>
            <div className="dash-content-user-text">
              <p className="dash-content-user-line">
                <span className="dash-content-user-name">{user.fullName}</span>
                <span className="dash-content-user-meta-sep" aria-hidden="true">
                  {" "}
                  ·{" "}
                </span>
                <span className="dash-content-user-role">{user.role}</span>
              </p>
            </div>
          </div>
          <div className="dash-content-user-actions">
            <div className="dash-notify-wrap">
              <button
                type="button"
                className={`dash-icon-btn${activeTab === "notifications" ? " dash-icon-btn--active" : ""}`}
                title="Notifications"
                aria-label={unreadCount > 0 ? `Open notifications, ${unreadCount} unread` : "Open notifications"}
                onClick={() => setActiveTab("notifications")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
              {unreadCount > 0 ? (
                <span className="dash-notify-badge" aria-hidden>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              className={`dash-icon-btn${activeTab === "profile" ? " dash-icon-btn--active" : ""}`}
              title="Profile"
              aria-label="Open profile"
              onClick={() => setActiveTab("profile")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
            {/* Dark mode toggle — top right, next to notifications */}
            <button
              type="button"
              className="dash-icon-btn dash-dark-toggle-topbar"
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => setDarkMode((d) => !d)}
            >
              {darkMode ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <header className="topbar dash-topbar">
          <div>
            <h1>
              {activeTab === "feed" && feedSection === "overview"
                ? "Platform overview"
                : activeTab === "feed" && feedSection === "browse"
                  ? "Browse posts"
                  : activeTab === "composer"
                    ? "Create new announcement"
                    : activeTab === "admin"
                      ? "Admin command center"
                      : `${activeTab[0].toUpperCase()}${activeTab.slice(1)}`}
            </h1>
            {activeTab === "feed" && feedSection === "overview" && (
              <p className="topbar-sub">
                {overviewDateLabel}
                {" — "}
                {user.role === "admin" ? "All-time statistics (admin)" : "Statistics from your current post list & activity"}
              </p>
            )}
          </div>
        </header>

        {activeTab === "feed" && (
          <section className="stack dash-feed-stack">
            {feedSection === "overview" && (
              <>
                <div className="dash-stats-row">
                  {user.role === "admin" && adminOverview ? (
                    <>
                      <OverviewStatCard icon="👥" label="Registered users" value={adminOverview.totalUsers} sub={`${adminOverview.verifiedUsers} verified`} />
                      <OverviewStatCard icon="📄" label="Active posts" value={adminOverview.activePosts} sub={`${postsCreatedMonth} new in list (30d)`} />
                      <OverviewStatCard icon="📅" label="Meetings scheduled" value={adminMeetingsTotal} sub={`${meetingsWeek} meeting events (7d)`} />
                      <OverviewStatCard icon="⭐" label="Successful matches" value={adminOverview.partnerFoundPosts} sub="Posts marked partner found" />
                    </>
                  ) : (
                    <>
                      <OverviewStatCard icon="📄" label="Posts in view" value={posts.length} sub={postsCreatedWeek ? `+${postsCreatedWeek} new this week` : "—"} />
                      <OverviewStatCard icon="✅" label="Active posts" value={stats.activePosts} sub="Published in current filters" />
                      <OverviewStatCard icon="💬" label="Interests" value={stats.activeInterests} sub={interestsMonth ? `+${interestsMonth} this month` : "—"} />
                      <OverviewStatCard icon="📅" label="Pending meetings" value={stats.pendingMeetings} sub={meetingsWeek ? `+${meetingsWeek} this week` : "—"} />
                    </>
                  )}
                </div>
                <div className="dash-charts-row">
                  <ActivityChart posts={posts} interests={interests} />
                  <DomainDonutChart posts={posts} />
                </div>
                <div className="dash-bottom-row">
                  <PostStatusPanel rows={postStatusRows.length ? postStatusRows : [{ key: "none", label: "No status data yet", count: 0, tone: "neutral" }]} />
                  <RecentActivityPanel items={recentActivityItems} />
                </div>
                <div className="dash-overview-cta">
                  <button type="button" className="ghost-button" onClick={() => setFeedSection("browse")}>Open post directory →</button>
                  <button type="button" onClick={() => { resetComposer(); setActiveTab("composer"); }}>New announcement</button>
                </div>
              </>
            )}

            {feedSection === "browse" && (
              <>
                <section className="panel dash-panel browse-filters-panel">
                  <div className="panel-header browse-filters-header">
                    <div>
                      <h2>Filters</h2>
                      <p className="browse-filters-lead">Refine the list — all fields are optional.</p>
                    </div>
                    <button type="button" className="ghost-button browse-filters-clear" onClick={() => setFilters(emptyFilters)}>
                      Clear all
                    </button>
                  </div>
                  <div className="filter-grid browse-filters-grid">
                    <Field label="Search" value={filters.search} onChange={(search) => setFilters({ ...filters, search })} />
                    <Field label="Domain" value={filters.domain} onChange={(domain) => setFilters({ ...filters, domain })} />
                    <Field label="City" value={filters.city} onChange={(city) => setFilters({ ...filters, city })} />
                    <Field label="Expertise" value={filters.expertise} onChange={(expertise) => setFilters({ ...filters, expertise })} />
                    <SelectField label="Stage" value={filters.stage} onChange={(stage) => setFilters({ ...filters, stage })} options={[{ value: "", label: "Any" }, ...projectStageOptions]} />
                    <SelectField label="Status" value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={[{ value: "", label: "Any" }, { value: "draft", label: "Draft" }, { value: "active", label: "Active" }, { value: "meeting_scheduled", label: "Meeting scheduled" }, { value: "partner_found", label: "Partner found" }, { value: "expired", label: "Expired" }]} />
                  </div>
                </section>
                <section className="browse-posts-board">
                  <div className="panel dash-panel browse-posts-panel">
                    <div className="panel-header">
                      <div>
                        <h2>Posts</h2>
                        <p>Open a card for full details and actions.</p>
                      </div>
                      <button type="button" onClick={() => { resetComposer(); setActiveTab("composer"); }}>New post</button>
                    </div>

                    {/* ── My Posts section ── */}
                    {ownScoredPosts.length > 0 && (
                      <div className="posts-section posts-section--mine">
                        <div className="posts-section-header">
                          <span className="posts-section-icon" aria-hidden>✦</span>
                          <div>
                            <h3 className="posts-section-title">My Posts</h3>
                            <p className="posts-section-sub">{ownScoredPosts.length} announcement{ownScoredPosts.length > 1 ? "s" : ""} you manage</p>
                          </div>
                        </div>
                        <div className="card-grid browse-board-grid">
                          {ownScoredPosts.map((post) => (
                            <article
                              className={`post-card post-card--browse post-card--own ${selectedPost?.id === post.id ? "selected" : ""}`}
                              key={post.id}
                              onClick={() => setSelectedPost(post)}
                            >
                              <div className="card-topline">
                                <span className="card-domain-tag">{post.workingDomain || "—"}</span>
                                <div className="card-topline-badges">
                                  <StatusBadge status={post.status} />
                                </div>
                              </div>
                              <h3 className="post-card-title">{post.title}</h3>
                              <p className="post-card-excerpt">{post.shortExplanation || post.description || "No summary provided."}</p>
                              <div className="post-card-footer">
                                <div className="post-card-meta">
                                  <span className="meta-chip meta-chip--location">📍 {post.city}, {post.country}</span>
                                  <span className="meta-chip">{labelFor(projectStageOptions, post.projectStage)}</span>
                                </div>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ── Community Posts section ── */}
                    {otherScoredPosts.length > 0 && (
                      <div className="posts-section posts-section--community">
                        <div className="posts-section-header">
                          <span className="posts-section-icon" aria-hidden>🌐</span>
                          <div>
                            <h3 className="posts-section-title">Community Posts</h3>
                            <p className="posts-section-sub">{otherScoredPosts.length} collaboration opportunit{otherScoredPosts.length > 1 ? "ies" : "y"} from the platform</p>
                          </div>
                        </div>
                        <div className="card-grid browse-board-grid">
                          {otherScoredPosts.map((post) => (
                            <article
                              className={`post-card post-card--browse post-card--community ${selectedPost?.id === post.id ? "selected" : ""} ${post.cityMatch ? "city-match" : ""}`}
                              key={post.id}
                              onClick={() => setSelectedPost(post)}
                            >
                              <div className="card-topline">
                                <span className="card-domain-tag">{post.workingDomain || "—"}</span>
                                <div className="card-topline-badges">
                                  <StatusBadge status={post.status} />
                                </div>
                              </div>
                              <h3 className="post-card-title">{post.title}</h3>
                              <p className="post-card-excerpt">{post.shortExplanation || post.description || "No summary provided."}</p>
                              <div className="post-card-owner-row">
                                <span className="post-card-owner-avatar" aria-hidden>{userInitials(post.owner?.fullName)}</span>
                                <span className="post-card-owner-name">{post.owner?.fullName || "Unknown"}</span>
                              </div>
                              <div className="post-card-footer">
                                <div className="post-card-meta">
                                  <span className="meta-chip meta-chip--location">📍 {post.city}, {post.country}</span>
                                  <span className="meta-chip">{labelFor(projectStageOptions, post.projectStage)}</span>
                                  {post.cityMatch ? <span className="meta-chip meta-chip--local">✓ Same city</span> : null}
                                </div>
                                <span className="score-badge" title={post.matchScoreLines?.join("\n")}>
                                  {post.healthAiMatchScore}/100
                                </span>
                              </div>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}

                    {!posts.length && <EmptyState title="No posts found" text="Adjust filters or create the first opportunity." />}
                  </div>
                </section>
                {selectedPost && (
                  <div
                    className="post-detail-modal-backdrop"
                    role="presentation"
                    onClick={(event) => {
                      if (event.target === event.currentTarget) setSelectedPost(null);
                    }}
                  >
                    <div
                      className="post-detail-modal"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="post-detail-modal-title"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="post-detail-modal-header">
                        <button type="button" className="post-detail-modal-close" aria-label="Close" onClick={() => setSelectedPost(null)}>
                          ×
                        </button>
                      </div>
                      <div className="post-detail-modal-body detail-panel dash-panel">
                        <div className="detail-panel-layout">
                          {(() => {
                            const detailScored = scoredPosts.find((p) => p.id === selectedPost.id);
                            const insight = detailScored || computeMatchInsight(selectedPost, user);
                            return (
                              <aside className="detail-match-rail" aria-label="Match score for you">
                                <div className="detail-match-score">{insight.healthAiMatchScore ?? insight.score}/100</div>
                                <p className="detail-match-label">Match for you</p>
                                <ul className="detail-match-list">
                                  {(insight.matchScoreLines || insight.lines || []).map((line, idx) => (
                                    <li key={idx}>{line}</li>
                                  ))}
                                </ul>
                              </aside>
                            );
                          })()}
                          <div className="detail-panel-main">
                            <div className="panel-header">
                              <div>
                                <h2 id="post-detail-modal-title">{selectedPost.title}</h2>
                                <p>{selectedPost.owner?.fullName} at {selectedPost.owner?.institution || "institution not set"}</p>
                              </div>
                              <StatusBadge status={selectedPost.status} />
                            </div>
                            <p>{selectedPost.description || selectedPost.highLevelIdea || "No detailed explanation yet."}</p>
                            <div className="detail-grid">
                              <div><strong>Healthcare need</strong><p>{selectedPost.healthcareNeed || "Not specified"}</p></div>
                              <div><strong>Technical need</strong><p>{selectedPost.technicalNeed || "Not specified"}</p></div>
                              <div><strong>Confidentiality</strong><p>{confidentialityLabel(selectedPost.confidentialityLevel)}</p></div>
                              <div><strong>Expires</strong><p>{formatDateShort(selectedPost.expiryDate)}</p></div>
                            </div>
                            <div className="card-actions">
                              {selectedPost.userId === user.id && <button type="button" className="ghost-button" onClick={() => editPost(selectedPost)}>Edit</button>}
                              {selectedPost.userId === user.id && selectedPost.status !== "partner_found" && <button type="button" className="btn-partner" onClick={() => updatePostStatus(selectedPost.id, "partner_found")}>Partner found</button>}
                              {selectedPost.userId === user.id && selectedPost.status !== "expired" && <button type="button" className="ghost-button" onClick={() => updatePostStatus(selectedPost.id, "expired")}>Expire</button>}
                              {selectedPost.userId === user.id && <button type="button" className="danger-button" onClick={() => deletePost(selectedPost.id)}>Delete</button>}
                            </div>
                            {selectedPost.userId !== user.id && selectedPost.status === "active" && (() => {
                              const mine = interests
                                .filter((i) => i.postId === selectedPost.id && i.requesterId === user.id)
                                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                              const openI = mine.find((i) => i.status !== "withdrawn");
                              const withdrawnI = mine.find((i) => i.status === "withdrawn");
                              return (
                                <div className="detail-interest-cta">
                                  {openI ? (
                                    <>
                                      <p className="detail-interest-hint">{interestFlowHint(openI.status)}</p>
                                      <div className="detail-interest-actions">
                                        <button type="button" className="ghost-button" onClick={() => setActiveTab("interests")}>
                                          Open Interests
                                        </button>
                                        {openI.status === "meeting_requested" ? (
                                          <button type="button" className="ghost-button" onClick={() => setActiveTab("meetings")}>
                                            Open Meetings
                                          </button>
                                        ) : null}
                                      </div>
                                    </>
                                  ) : withdrawnI ? (
                                    <>
                                      <p className="detail-interest-hint">You withdrew interest in this post. Reinstate to continue the same thread (proposed times will be cleared).</p>
                                      <button type="button" onClick={() => reinstateInterest(withdrawnI)}>
                                        Reinstate interest
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <p className="detail-interest-hint">Meeting flow continues in Interests and Meetings after you express interest.</p>
                                      <button type="button" onClick={() => setShowNdaModal(true)}>
                                        Express interest
                                      </button>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {activeTab === "composer" && (
          <section className="panel composer-panel">
            <div className="panel-header">
              <div>
                <h2>{editingPostId ? "Edit post" : "Create post"}</h2>
                <p>Create a safe announcement in three focused steps.</p>
              </div>
              {editingPostId && <button className="ghost-button" onClick={resetComposer}>Cancel edit</button>}
            </div>
            <div className="composer-steps">
              {studioSteps.map((step, index) => (
                <button type="button" key={step.title} className={`step-button ${composerStep === index ? "active" : ""}`} onClick={() => setComposerStep(index)}>
                  <span className="step-index">{index + 1}</span>
                  <strong>{step.title}</strong>
                  <small>{step.caption}</small>
                </button>
              ))}
            </div>
            <div className="composer-step-panel">
              {composerStep === 0 && (
                <div className="form-grid wide-grid">
                  <Field label="Title" value={postForm.title} onChange={(title) => setPostForm({ ...postForm, title })} />
                  <Field label="Working domain" value={postForm.workingDomain} onChange={(workingDomain) => setPostForm({ ...postForm, workingDomain })} />
                  <Field label="Required expertise" value={postForm.requiredExpertise} onChange={(requiredExpertise) => setPostForm({ ...postForm, requiredExpertise })} />
                  <SelectField label="Country" value={postForm.country} onChange={(country) => setPostForm({ ...postForm, country })} options={countryOptions.length ? countryOptions : [{ value: "Turkey", label: "Turkey" }]} />
                  <SelectField label="City" value={postForm.city} onChange={(city) => setPostForm({ ...postForm, city })} options={citySelectOptions.length ? citySelectOptions : [{ value: "Ankara", label: "Ankara" }]} />
                  <TextAreaField label="Short explanation" value={postForm.shortExplanation} onChange={(shortExplanation) => setPostForm({ ...postForm, shortExplanation })} placeholder="Briefly describe the collaboration opportunity without sensitive technical details." />
                </div>
              )}
              {composerStep === 1 && (
                <div className="form-grid wide-grid">
                  <SelectField label="Project stage" value={postForm.projectStage} onChange={(projectStage) => setPostForm({ ...postForm, projectStage })} options={projectStageOptions} />
                  <SelectField label="Commitment" value={postForm.commitmentLevel} onChange={(commitmentLevel) => setPostForm({ ...postForm, commitmentLevel })} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
                  <SelectField label="Collaboration type" value={postForm.collaborationType} onChange={(collaborationType) => setPostForm({ ...postForm, collaborationType })} options={collaborationTypeOptions} />
                  <TextAreaField label="Healthcare expertise needed" value={postForm.healthcareNeed} onChange={(healthcareNeed) => setPostForm({ ...postForm, healthcareNeed })} placeholder="For engineer-led posts, explain what clinical or workflow expertise is needed." />
                  <TextAreaField label="Technical expertise needed" value={postForm.technicalNeed} onChange={(technicalNeed) => setPostForm({ ...postForm, technicalNeed })} placeholder="For healthcare-led posts, explain what engineering competence is needed." />
                  <TextAreaField label="High-level idea" value={postForm.highLevelIdea} onChange={(highLevelIdea) => setPostForm({ ...postForm, highLevelIdea })} placeholder="Keep this non-confidential; details can be discussed after NDA and meeting agreement." />
                </div>
              )}
              {composerStep === 2 && (
                <div className="form-grid wide-grid">
                  <SelectField label="Confidentiality" value={postForm.confidentialityLevel} onChange={(confidentialityLevel) => setPostForm({ ...postForm, confidentialityLevel })} options={[{ value: "public", label: "Public short pitch" }, { value: "nda_required", label: "Details discussed in meeting only" }]} />
                  <Field label="Expiry date" type="date" value={postForm.expiryDate} onChange={(expiryDate) => setPostForm({ ...postForm, expiryDate })} />
                  <TextAreaField label="Additional public details" value={postForm.description} onChange={(description) => setPostForm({ ...postForm, description })} placeholder="Optional public context. Do not include patient data, files, contracts or medical advice." />
                  <label className="composer-option-card">
                    <input
                      type="checkbox"
                      className="composer-option-check"
                      checked={postForm.autoClose}
                      onChange={(event) => setPostForm({ ...postForm, autoClose: event.target.checked })}
                    />
                    <span className="composer-option-body">
                      <span className="composer-option-title">Auto-close when partner found</span>
                      <span className="composer-option-desc">Hides this post from active discovery after you mark partner found.</span>
                    </span>
                  </label>
                </div>
              )}
            </div>
            <div className="form-actions composer-footer-actions">
              <div className="composer-footer-nav" role="group" aria-label="Step navigation">
                <button type="button" className="composer-nav-btn" onClick={() => setComposerStep((step) => clampStep(step - 1))} disabled={composerStep === 0}>
                  Back
                </button>
                <button type="button" className="composer-nav-btn" onClick={() => setComposerStep((step) => clampStep(step + 1))} disabled={composerStep === studioSteps.length - 1}>
                  Next
                </button>
              </div>
              <div className="composer-footer-save" role="group" aria-label="Save and publish">
                <button type="button" className="composer-draft-btn" onClick={() => savePost("draft")} disabled={loading}>
                  Save draft
                </button>
                <button type="button" className="composer-publish-btn" onClick={() => savePost("active")} disabled={loading}>
                  Publish
                </button>
              </div>
            </div>
          </section>
        )}

        {!!publishValidationModal.length && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10, 22, 40, 0.45)",
              display: "grid",
              placeItems: "center",
              zIndex: 999,
              padding: "16px",
            }}
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setPublishValidationModal([]);
              }
            }}
          >
            <div
              style={{
                width: "min(460px, 92vw)",
                background: "#ffffff",
                borderRadius: "16px",
                padding: "20px 22px",
                boxShadow: "0 12px 36px rgba(0, 0, 0, 0.16)",
                border: "1px solid #e8edf4",
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="publish-validation-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span
                  aria-hidden
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    width: "34px",
                    height: "34px",
                    borderRadius: "999px",
                    background: "#fff4e8",
                    color: "#c2410c",
                    fontSize: "16px",
                    flexShrink: 0,
                  }}
                >
                  !
                </span>
                <div>
                  <h2 id="publish-validation-title" style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>
                    Complete these fields before publishing
                  </h2>
                  <p style={{ margin: "4px 0 0", color: "#475569", fontSize: "14px", lineHeight: 1.5 }}>
                    We found a few required items missing from your post.
                  </p>
                </div>
              </div>
              <div style={{ height: 0, margin: "16px 0", borderTop: "1px solid #e2e8f0" }} />
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "10px" }}>
                {publishValidationModal.map((field) => (
                  <li
                    key={field.key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "16px",
                      listStyle: "none",
                      margin: 0,
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <strong style={{ color: "#0f172a", fontSize: "14px", display: "block" }}>{field.label}</strong>
                    <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap", display: "block" }}>
                      Step {field.step + 1}: {studioSteps[field.step].title}
                    </span>
                  </li>
                ))}
              </ul>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
                <button type="button" className="ghost-button" onClick={() => setPublishValidationModal([])}>
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setComposerStep(publishValidationModal[0]?.step ?? 0);
                    setPublishValidationModal([]);
                  }}
                >
                  Take me there
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "interests" && (
          <section className="panel">
            <div className="interests-section-header">
              <h2>Interests</h2>
              <p>Handle first-contact messages before creating a meeting request.</p>
            </div>
            <div className="interests-grid">
              {interests.map((interest) => {
                const ownerView = interest.ownerId === user.id;
                const requesterView = interest.requesterId === user.id;
                const meetingDraftForInterest = interestMeetingDrafts[interest.id] || {};
                const hasSlots = Boolean(interest.timeSlots?.length);
                return (
                  <article className="interest-card" key={interest.id} data-status={interest.status}>
                    {/* Header */}
                    <div className="interest-card-header">
                      <div className="interest-card-domain">{interest.post?.workingDomain || "—"}</div>
                      <StatusBadge status={interest.status} />
                    </div>

                    {/* Title + message */}
                    <div>
                      <h3 className="interest-card-title">{interest.post?.title}</h3>
                      {interest.message && (
                        <p className="interest-card-message">{interest.message}</p>
                      )}
                    </div>

                    {/* People row */}
                    <div className="interest-people-row">
                      <span className="interest-person-pill interest-person-pill--requester">
                        <span className="interest-person-avatar">{userInitials(interest.requester?.fullName)}</span>
                        {interest.requester?.fullName}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>→</span>
                      <span className="interest-person-pill interest-person-pill--owner">
                        <span className="interest-person-avatar">{userInitials(interest.owner?.fullName)}</span>
                        {interest.owner?.fullName}
                      </span>
                      <span className="interest-person-pill interest-person-pill--conf">
                        {interest.post?.confidentialityLevel?.replaceAll("_", " ")}
                      </span>
                    </div>

                    {/* Time slots */}
                    {hasSlots && (
                      <div className="interest-slots-list">
                        {interest.timeSlots.map((slot) => (
                          <div className="interest-slot-item" key={slot.id}>
                            <span className="interest-slot-icon">🕐</span>
                            <span>{formatDate(slot.proposedAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Owner: propose time slots */}
                    {ownerView && (interest.status === "pending" || interest.status === "acknowledged") && (
                      <div className="meeting-form">
                        <InterestSlotPlanner
                          key={`${interest.id}-${interest.timeSlots?.length ?? 0}-${interest.status}`}
                          disabled={loading}
                          onSubmit={(proposedSlots) => proposeInterestSlots(interest, proposedSlots)}
                        />
                      </div>
                    )}

                    {/* Requester: choose slot */}
                    {requesterView && interest.status === "acknowledged" && hasSlots && (
                      <div className="meeting-form">
                        <SelectField
                          label="Choose slot"
                          value={interestSelections[interest.id] || interest.timeSlots[0].id}
                          onChange={(slotId) => setInterestSelections((current) => ({ ...current, [interest.id]: slotId }))}
                          options={interest.timeSlots.map((slot) => ({ value: slot.id, label: formatDate(slot.proposedAt) }))}
                        />
                        <TextAreaField
                          label="Meeting note"
                          value={meetingDraftForInterest.message || ""}
                          onChange={(value) => setInterestMeetingDrafts((current) => ({ ...current, [interest.id]: { ...meetingDraftForInterest, message: value } }))}
                        />
                        <label className="checkbox">
                          <input
                            type="checkbox"
                            checked={Boolean(meetingDraftForInterest.ndaAccepted)}
                            onChange={(event) => setInterestMeetingDrafts((current) => ({ ...current, [interest.id]: { ...meetingDraftForInterest, ndaAccepted: event.target.checked } }))}
                          />
                          I accept the NDA and first-contact terms before detailed discussion.
                        </label>
                        <button
                          type="button"
                          disabled={!meetingDraftForInterest.ndaAccepted}
                          onClick={() => requestMeetingFromInterest(interest)}
                        >
                          Send meeting request
                        </button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="interest-card-actions">
                      {requesterView && interest.status === "withdrawn" && (
                        <button type="button" onClick={() => reinstateInterest(interest)}>Reinstate interest</button>
                      )}
                      {requesterView && interest.status !== "withdrawn" && interest.status !== "meeting_requested" && (
                        <button type="button" className="ghost-button" onClick={() => withdrawInterest(interest)}>Withdraw</button>
                      )}
                    </div>
                  </article>
                );
              })}
              {!interests.length && <EmptyState title="No interests yet" text="First-contact messages will appear here before meeting requests." />}
            </div>
          </section>
        )}

        {activeTab === "meetings" && (
          <section className="panel">
            <div className="meetings-section-header">
              <h2>Meetings</h2>
              <p>Accept selected slots, decline unsuitable requests or confirm a slot when more than one option is still open. After scheduling, either side can paste a Zoom / Teams / Meet link so both can join.</p>
            </div>
            <div className="meetings-grid">
              {meetings.map((meeting) => (
                <article className="meeting-card-v2" key={meeting.id}>
                  {/* Header */}
                  <div className="meeting-card-v2-header">
                    <span className="meeting-card-v2-domain">{meeting.post?.workingDomain || "—"}</span>
                    <div className="meeting-card-v2-badges">
                      <StatusBadge status={meeting.status} />
                      {isMeetingSlotMissed(meeting) ? <span className="status-badge status-missed-meeting">Missed</span> : null}
                    </div>
                  </div>

                  {/* Title + message */}
                  <div>
                    <h3 className="meeting-card-v2-title">{meeting.post?.title}</h3>
                    {(meeting.message && meeting.message !== "No message provided.") && (
                      <p className="meeting-card-v2-message">{meeting.message}</p>
                    )}
                  </div>

                  {/* People row */}
                  <div className="meeting-people-row">
                    <span className="meeting-person-pill meeting-person-pill--req">
                      👤 {meeting.requester?.fullName}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>→</span>
                    <span className="meeting-person-pill meeting-person-pill--own">
                      🏥 {meeting.owner?.fullName}
                    </span>
                  </div>

                  {/* Multiple time slots (when accepted status still choosing) */}
                  {(meeting.timeSlots?.length > 0) && (
                    <div className="interest-slots-list">
                      {meeting.timeSlots.map((slot) => (
                        <div className="interest-slot-item" key={slot.id}>
                          <span className="interest-slot-icon">🕐</span>
                          <span>{formatDate(slot.proposedAt)}</span>
                          {meeting.status === "accepted" && (
                            <button
                              style={{ marginLeft: "auto", padding: "0.2rem 0.65rem", fontSize: "0.78rem" }}
                              className="ghost-button"
                              onClick={() => confirmSlot(meeting, slot.id)}
                            >
                              Confirm
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected slot callout */}
                  {meeting.selectedSlot && (
                    <div className="meeting-selected-slot-box">
                      <span className="meeting-selected-slot-icon">📅</span>
                      <div>
                        <div className="meeting-selected-slot-label">Selected slot</div>
                        <div className="meeting-selected-slot-time">{formatDate(meeting.selectedSlot)}</div>
                        {isMeetingSlotMissed(meeting) && (
                          <p style={{ margin: "0.35rem 0 0", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.4 }}>
                            This meeting window has passed. Reschedule or start a new interest flow.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Video link section */}
                  {(meeting.status === "pending" || meeting.status === "accepted" || meeting.status === "scheduled") && (
                    <div className="meeting-join-section">
                      {meeting.joinUrl ? (
                        <a className="meeting-join-open" href={meeting.joinUrl} target="_blank" rel="noopener noreferrer">
                          Join video meeting
                        </a>
                      ) : (
                        <p className="meeting-join-placeholder">No video link yet — add a Zoom, Microsoft Teams, or Google Meet URL below.</p>
                      )}
                      {(meeting.ownerId === user.id || meeting.requesterId === user.id) && (
                        <div className="meeting-join-form">
                          <Field
                            label="Video meeting URL"
                            placeholder="https://zoom.us/j/…"
                            value={meetingJoinDrafts[meeting.id] !== undefined ? meetingJoinDrafts[meeting.id] : meeting.joinUrl || ""}
                            onChange={(value) => setMeetingJoinDrafts((current) => ({ ...current, [meeting.id]: value }))}
                          />
                          <div className="meeting-join-actions">
                            <button type="button" disabled={loading} onClick={() => saveMeetingJoinUrl(meeting)}>
                              Save link
                            </button>
                            {meeting.joinUrl ? (
                              <button type="button" className="ghost-button" disabled={loading} onClick={() => clearMeetingJoinUrl(meeting)}>
                                Remove link
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="meeting-card-v2-actions">
                    {meeting.ownerId === user.id && meeting.status === "pending" && (
                      <button onClick={() => meetingAction(meeting, "accept")}>{meeting.selectedSlot ? "Accept and schedule" : "Accept"}</button>
                    )}
                    {meeting.ownerId === user.id && meeting.status === "pending" && (
                      <button className="ghost-button" onClick={() => meetingAction(meeting, "decline")}>Decline</button>
                    )}
                    {meeting.requesterId === user.id && meeting.status === "pending" && (
                      <button className="ghost-button" onClick={() => meetingAction(meeting, "cancel")}>Cancel</button>
                    )}
                  </div>
                </article>
              ))}
              {!meetings.length && <EmptyState title="No meetings yet" text="Meeting requests will appear here after a user expresses interest." />}
            </div>
          </section>
        )}

        {activeTab === "notifications" && (
          <section className="panel notif-panel">
            <div className="notif-panel-header">
              <div>
                <h2 className="notif-panel-title">Notifications</h2>
                <p className="notif-panel-sub">{unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} — system, verification and meeting updates.</p>
              </div>
              <button className="ghost-button" onClick={readAllNotifications}>Mark all read</button>
            </div>
            <div className="notif-feed">
              {notifications.map((notification) => {
                const typeKey = notification.type || "";
                const typeLabel = typeKey.replaceAll("_", " ");
                const typeIcon = typeKey.includes("meeting") ? "📅" :
                  typeKey.includes("interest") ? "💬" :
                  typeKey.includes("verif") ? "✅" :
                  typeKey.includes("partner") ? "🤝" :
                  typeKey.includes("security") || typeKey.includes("login") ? "🔐" : "🔔";
                const typeColor = typeKey.includes("meeting") ? "notif-item--meeting" :
                  typeKey.includes("interest") ? "notif-item--interest" :
                  typeKey.includes("verif") ? "notif-item--verify" : "notif-item--default";
                return (
                  <article
                    className={`notif-item ${typeColor} ${notification.read ? "" : "notif-item--unread"}`}
                    key={notification.id}
                  >
                    <div className="notif-item-icon" aria-hidden>{typeIcon}</div>
                    <div className="notif-item-body">
                      <div className="notif-item-header">
                        <span className="notif-item-type">{typeLabel}</span>
                        {!notification.read && <span className="notif-unread-dot" aria-hidden />}
                      </div>
                      <p className="notif-item-message">{notification.message}</p>
                      <div className="notif-item-footer">
                        <time className="notif-item-time">{formatDate(notification.createdAt)}</time>
                        <button className="notif-delete-btn" onClick={() => deleteNotification(notification.id)}>Delete</button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {!notifications.length && <EmptyState title="No notifications" text="You are all caught up." />}
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="dashboard-grid">
            <form className="panel form-stack" onSubmit={saveProfile}>
              <div className="panel-header">
                <div>
                  <h2>Profile</h2>
                  <p>These fields power trust, matching and profile discovery.</p>
                </div>
              </div>
              <div className="form-grid">
                <Field label="Full name" value={profileForm.fullName} onChange={(fullName) => setProfileForm({ ...profileForm, fullName })} />
                <Field label="Institution" value={profileForm.institution} onChange={(institution) => setProfileForm({ ...profileForm, institution })} />
                <SelectField label="Country" value={profileForm.country} onChange={(country) => setProfileForm({ ...profileForm, country })} options={countryOptions.length ? countryOptions : [{ value: "Turkey", label: "Turkey" }]} />
                <SelectField label="City" value={profileForm.city} onChange={(city) => setProfileForm({ ...profileForm, city })} options={citySelectOptions.length ? citySelectOptions : [{ value: "Ankara", label: "Ankara" }]} />
                <Field label="Expertise" value={profileForm.expertise} onChange={(expertise) => setProfileForm({ ...profileForm, expertise })} />
                <TextAreaField label="Bio" value={profileForm.bio} onChange={(bio) => setProfileForm({ ...profileForm, bio })} />
              </div>
              <div className="form-actions">
                <button type="submit">Save profile</button>
                <button type="button" className="ghost-button" onClick={exportMyData}>⬇ Download My Data (JSON)</button>
                <button type="button" className="danger-button" onClick={deleteAccount}>Delete account</button>
              </div>
            </form>
            <section className="panel">
              <h2>Account state</h2>
              <div className="detail-grid">
                <div><strong>Role</strong><p>{user.role}</p></div>
                <div><strong>Verified</strong><p>{user.verified ? "Yes" : "No"}</p></div>
                <div><strong>Suspended</strong><p>{user.suspended ? "Yes" : "No"}</p></div>
                <div><strong>City</strong><p>{user.city}</p></div>
              </div>
            </section>
          </section>
        )}

        {activeTab === "admin" && user.role === "admin" && (
          <section className="stack admin-console">
            <div className="metrics-row">
              <StatCard label="Total Projects" value={adminOverview?.activePosts || 0} hint="📁 Live and managed posts" />
              <StatCard label="Verified Experts" value={adminUsers.filter((item) => item.verified).length} hint="✅ Trusted specialist accounts" />
              <StatCard label="Active Meetings" value={meetings.filter((item) => item.status === "scheduled" || item.status === "accepted").length} hint="📅 In-progress collaboration flow" />
              <StatCard label="Security Logs" value={adminOverview?.logsCount || 0} hint="🛡️ Auditable security events" />
            </div>
            <section className="dashboard-grid admin-dashboard-grid">
              <article className="panel admin-chart-panel">
                <div className="panel-header admin-panel-head">
                  <div>
                    <h2>Activity trends</h2>
                    <p>Line chart of five counts on one linear scale (max = tallest point).</p>
                  </div>
                </div>
                {(() => {
                  const trendLabels = ["Logins 24h", "Pending mtgs", "Posts", "Users", "Logs"];
                  const trendValues = [
                    adminOverview?.failedLogins24h || 0,
                    adminOverview?.pendingMeetings || 0,
                    adminOverview?.activePosts || 0,
                    adminUsers.length,
                    adminOverview?.logsCount || 0,
                  ];
                  const t = adminTrendChartModel(trendValues, trendLabels);
                  const gidArea = `${adminTrendChartId}-trend-area`;
                  const gidLine = `${adminTrendChartId}-trend-line`;
                  const vb = `0 0 ${t.vbW} ${t.vbH}`;
                  return (
                    <div className="chart-box admin-trend-chart">
                      <svg viewBox={vb} className="admin-trend-svg" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Admin activity trend">
                        <defs>
                          <linearGradient id={gidArea} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.26" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.04" />
                          </linearGradient>
                          <linearGradient id={gidLine} x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#1d4ed8" />
                            <stop offset="100%" stopColor="#0891b2" />
                          </linearGradient>
                        </defs>
                        {t.gridYs.map((gy, i) => (
                          <line
                            key={i}
                            x1={t.padL}
                            x2={t.vbW - t.padR}
                            y1={gy}
                            y2={gy}
                            className="admin-trend-gridline"
                          />
                        ))}
                        <path d={t.areaD} fill={`url(#${gidArea})`} />
                        <polyline
                          fill="none"
                          stroke={`url(#${gidLine})`}
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={t.linePoints}
                        />
                        {t.pts.map((p, i) => (
                          <g key={i}>
                            <title>{`${trendLabels[i]}: ${p.v}`}</title>
                            <circle cx={p.x} cy={p.y} r="3.4" className="admin-trend-dot-ring" />
                            <circle cx={p.x} cy={p.y} r="2" fill="#ffffff" stroke="#1d4ed8" strokeWidth="0.9" />
                          </g>
                        ))}
                        {t.pts.map((p, i) => (
                          <text
                            key={`lbl-${i}`}
                            x={p.x}
                            y={t.vbH - 4}
                            textAnchor="middle"
                            className="admin-trend-tick"
                          >
                            {trendLabels[i]?.split(" ")[0] ?? ""}
                          </text>
                        ))}
                      </svg>
                    </div>
                  );
                })()}
              </article>
              <article className="panel admin-chart-panel">
                <div className="panel-header admin-panel-head">
                  <div>
                    <h2>Domain mix</h2>
                    <p>Share of posts by working domain (top five).</p>
                  </div>
                </div>
                {(() => {
                  const donut = domainDonutModel(domainDistribution);
                  return (
                    <div className="donut-wrap admin-donut-wrap">
                      <div className="admin-donut-side">
                        <div
                          className="donut-chart admin-donut-ring"
                          style={{ background: donut.gradient }}
                          role="img"
                          aria-label="Domain distribution"
                        />
                        <p className="admin-donut-total">
                          <strong>{donut.total}</strong>
                          <span>posts</span>
                        </p>
                      </div>
                      <ul className="admin-donut-legend">
                        {donut.segments.map((s) => (
                          <li key={s.domain}>
                            <span className="admin-donut-swatch" style={{ background: s.color }} aria-hidden />
                            <span className="admin-donut-name" title={s.domain}>{s.domain}</span>
                            <span className="admin-donut-meta">{s.count} · {s.pct}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </article>
            </section>
            <section className="panel admin-data-panel">
              <div className="panel-header admin-panel-head">
                <div>
                  <h2>Users</h2>
                  <p>Institutional accounts are verified only through email confirmation. Use suspend controls for moderation.</p>
                </div>
              </div>
              <div className="table-wrap users-table-wrap admin-table-wrap">
                <table>
                  <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>City</th><th>State</th><th>Actions</th></tr></thead>
                  <tbody>
                    {adminUsers.map((adminUser) => (
                      <tr key={adminUser.id}>
                        <td>{adminUser.fullName}</td>
                        <td>{adminUser.email}</td>
                        <td>{adminUser.role}</td>
                        <td>{adminUser.city}</td>
                        <td>{adminUser.verified ? "Verified" : "Pending"} {adminUser.suspended ? "Suspended" : ""}</td>
                        <td>
                          <button className="ghost-button" onClick={() => suspendUser(adminUser.id, !adminUser.suspended)}>{adminUser.suspended ? "Unsuspend" : "Suspend"}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel admin-data-panel">
              <div className="panel-header admin-panel-head">
                <div>
                  <h2>Posts</h2>
                  <p>Lifecycle, scores, and moderation actions.</p>
                </div>
              </div>
              <div className="table-wrap admin-table-wrap">
                <table>
                  <thead><tr><th>Title</th><th>Status</th><th>Owner</th><th>City</th><th>Match Score</th><th>Actions</th></tr></thead>
                  <tbody>
                    {adminPosts.map((post) => {
                      const adminMatch = computeMatchInsight(post, user);
                      return (
                        <tr key={post.id}>
                          <td>{post.title}</td>
                          <td><StatusBadge status={post.status} /></td>
                          <td>{post.owner?.fullName}</td>
                          <td>{post.city}</td>
                          <td className="admin-match-score-cell">
                            <span className="score-badge" title={adminMatch.lines.join("\n")}>
                              {adminMatch.score}
                            </span>
                          </td>
                          <td>
                            <button className="ghost-button" onClick={() => adminPostStatus(post.id, "active")}>Activate</button>
                            <button className="ghost-button" onClick={() => adminPostStatus(post.id, "expired")}>Expire</button>
                            <button className="danger-button" onClick={() => removePostAsAdmin(post.id)}>Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel admin-data-panel">
              <div className="panel-header admin-panel-head">
                <div>
                  <h2>Activity logs</h2>
                  <p>Audit trail — export for reporting.</p>
                </div>
                <button type="button" className="ghost-button admin-export-btn" onClick={exportLogs}>
                  Export CSV
                </button>
              </div>
              <div className="table-wrap admin-log-wrap admin-table-wrap">
                <table>
                  <thead><tr><th>Time</th><th>Role</th><th>Action</th><th>Target</th><th>Result</th></tr></thead>
                  <tbody>
                    {adminLogs.slice(0, 120).map((log) => (
                      <tr key={log.id}>
                        <td>{formatDate(log.timestamp)}</td>
                        <td>{log.role}</td>
                        <td>{log.actionType}</td>
                        <td className="target-cell" title={log.targetEntity || "N/A"}>{log.targetEntity || "N/A"}</td>
                        <td>{log.resultStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            {adminAnomalies && (
              <section className="panel admin-data-panel">
                <div className="panel-header admin-panel-head">
                  <div>
                    <h2>Security anomalies</h2>
                    <p>Last 24h — failed logins and related signals.</p>
                  </div>
                </div>
                <div className="admin-anomaly-grid">
                  <div className="admin-anomaly-card">
                    <h3 className="admin-anomaly-title">Failed login IPs</h3>
                    {adminAnomalies.failedLoginByIp.length ? (
                      <ul className="admin-anomaly-list">
                        {adminAnomalies.failedLoginByIp.map((item) => (
                          <li key={item.ipAddress}>
                            <span className="admin-anomaly-meta">{item.ipAddress}</span>
                            <span className={`admin-risk-pill admin-risk-pill--${String(item.risk || "low").toLowerCase()}`}>{item.count} · {item.risk}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="admin-anomaly-empty">No suspicious IP activity.</p>
                    )}
                  </div>
                  <div className="admin-anomaly-card">
                    <h3 className="admin-anomaly-title">Failed login users</h3>
                    {adminAnomalies.failedLoginByUser.length ? (
                      <ul className="admin-anomaly-list">
                        {adminAnomalies.failedLoginByUser.map((item) => (
                          <li key={item.userId}>
                            <span className="admin-anomaly-meta" title={item.userId}>
                              {(item.userId || "").length > 10 ? `${(item.userId || "").slice(0, 8)}…` : item.userId || "—"}
                            </span>
                            <span className={`admin-risk-pill admin-risk-pill--${String(item.risk || "low").toLowerCase()}`}>{item.count} · {item.risk}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="admin-anomaly-empty">No repeated user failures.</p>
                    )}
                  </div>
                  <div className="admin-anomaly-card">
                    <h3 className="admin-anomaly-title">Security events</h3>
                    <p className="admin-anomaly-summary">
                      {adminAnomalies.recentSecurityEvents.length
                        ? `${adminAnomalies.recentSecurityEvents.length} recent events`
                        : "No recent security events."}
                    </p>
                  </div>
                  <div className="admin-anomaly-card">
                    <h3 className="admin-anomaly-title">Window</h3>
                    <p className="admin-anomaly-summary">{adminAnomalies.window}</p>
                  </div>
                </div>
              </section>
            )}
            {adminStats && (
              <section className="panel admin-data-panel">
                <div className="panel-header admin-panel-head">
                  <div>
                    <h2>Statistics</h2>
                    <p>Counts across users, posts, meetings, and cities.</p>
                  </div>
                </div>
                <div className="admin-stat-grid">
                  <div className="admin-stat-block">
                    <h3 className="admin-stat-label">Roles</h3>
                    <ul className="admin-stat-chips">
                      {adminStats.usersByRole.map((item) => (
                        <li key={item.role}><span className="admin-stat-chip">{item.role}</span> {item._count.role}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="admin-stat-block">
                    <h3 className="admin-stat-label">Post states</h3>
                    <ul className="admin-stat-chips">
                      {adminStats.postsByStatus.map((item) => (
                        <li key={item.status}><span className="admin-stat-chip">{item.status}</span> {item._count.status}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="admin-stat-block">
                    <h3 className="admin-stat-label">Meeting states</h3>
                    <ul className="admin-stat-chips">
                      {adminStats.meetingsByStatus.map((item) => (
                        <li key={item.status}><span className="admin-stat-chip">{item.status}</span> {item._count.status}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="admin-stat-block">
                    <h3 className="admin-stat-label">Cities</h3>
                    <ul className="admin-stat-chips">
                      {adminStats.postsByCity.map((item, idx) => (
                        <li key={`${item.city}-${idx}`}><span className="admin-stat-chip">{item.city}</span> {item.count}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>
            )}
          </section>
        )}

        {showNdaModal && (
          <NDAModal
            post={selectedPost}
            initialMessage={interestDraft.message}
            onClose={() => setShowNdaModal(false)}
            onSend={expressInterest}
          />
        )}

        {false && showNdaModal && (
          <div
            className="modal-backdrop"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setShowNdaModal(false);
                setNdaAcceptedForInterest(false);
              }
            }}
          >
            <div
              className="nda-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="nda-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="nda-modal-header">
                <span className="nda-modal-icon" aria-hidden>🔒</span>
                <h2 id="nda-modal-title">Express interest</h2>
              </div>
              <div className="nda-modal-rule" />
              <p className="nda-modal-lead">Add a short first-contact note. The post owner will respond in Interests with proposed times before you request a meeting.</p>
              <div className="nda-modal-field">
                <TextAreaField label="Short message" value={interestDraft.message} onChange={(messageValue) => setInterestDraft({ message: messageValue })} />
              </div>
              <p className="nda-modal-lead nda-modal-lead--compact">
                By sending this request you agree not to share any ideas discussed without written consent.
              </p>
              <p className="nda-modal-meta">
                <span>NDA Version: 1.0</span>
                <span className="nda-meta-sep" aria-hidden>|</span>
                <span>Date: {new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
              </p>
              <label className="nda-modal-checkbox">
                <input
                  type="checkbox"
                  checked={ndaAcceptedForInterest}
                  onChange={(event) => setNdaAcceptedForInterest(event.target.checked)}
                />
                <span>I have read and accept the NDA</span>
              </label>
              <div className="nda-modal-actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => {
                    setShowNdaModal(false);
                    setNdaAcceptedForInterest(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="nda-modal-accept"
                  onClick={expressInterest}
                  disabled={!ndaAcceptedForInterest || !String(interestDraft.message || "").trim()}
                >
                  Accept &amp; Send
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 3200,
          style: {
            maxWidth: "560px",
            background: "rgba(9, 52, 89, 0.94)",
            color: "#ffffff",
            border: "1px solid rgba(255, 255, 255, 0.26)",
            borderRadius: "12px",
          },
        }}
      />
    </main>
  );
}

export default App;
