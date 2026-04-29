import { useEffect, useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
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

const studioSteps = [
  { title: "Basic info", caption: "Title, domain and location" },
  { title: "Collaboration", caption: "Needs, expertise and stage" },
  { title: "Safety", caption: "Confidentiality and publish settings" },
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

function formatApiError(payload) {
  if (!payload) return "We could not complete your request.";
  const baseMessage = payload.message && payload.message !== "Validation failed."
    ? payload.message
    : "Please check the highlighted fields and try again.";

  if (!Array.isArray(payload.details) || !payload.details.length) {
    return baseMessage;
  }

  const detailText = payload.details
    .map((item) => {
      const field = toSentenceCase(item?.path || "Field");
      const message = String(item?.msg || "").trim();
      if (!message) return "";
      // Avoid repeating field names when backend already includes it.
      if (message.toLowerCase().includes(String(item?.path || "").toLowerCase())) {
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
    throw new Error(formatApiError(payload));
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

function splitLines(value) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
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
  if (!registerForm.privacyAccepted) return "Please agree to the Privacy Policy to create an account.";
  return "";
}

function calculateMatchScore(post, currentUser) {
  if (!post || !currentUser) return 0;
  const cityScore = post.city === currentUser.city ? 30 : 0;
  const countryScore = post.country === currentUser.country ? 15 : 0;
  const roleScore = post.owner?.role && post.owner?.role !== currentUser.role ? 40 : 0;
  const expertise = String(currentUser.expertise || "").toLowerCase();
  const domain = String(post.workingDomain || "").toLowerCase();
  const required = String(post.requiredExpertise || "").toLowerCase();
  const domainScore = expertise.includes(domain) || expertise.includes(required) ? 15 : 0;
  return Math.min(cityScore + countryScore + roleScore + domainScore, 100);
}

function chartSeries(values) {
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => `${(index / (values.length - 1)) * 100},${100 - (value / max) * 100}`)
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
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

function StatCard({ label, value, hint }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
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
    <label>
      {label}
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
    <label>
      {label}
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
        <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem("health-ai-session");
    return saved ? JSON.parse(saved) : null;
  });
  const [view, setView] = useState("login");
  const [activeTab, setActiveTab] = useState("feed");
  const [locations, setLocations] = useState([]);
  const [loginForm, setLoginForm] = useState(emptyLoginForm);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [verificationToken, setVerificationToken] = useState("");
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
  const [interestSlotDrafts, setInterestSlotDrafts] = useState({});
  const [interestSelections, setInterestSelections] = useState({});
  const [interestMeetingDrafts, setInterestMeetingDrafts] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [meetingDraft, setMeetingDraft] = useState({
    message: "",
    ndaAccepted: false,
    proposedSlots: "2026-04-22T10:00\n2026-04-22T14:00",
  });
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [profileForm, setProfileForm] = useState(emptyProfile);
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

  const token = session?.token || "";
  const user = session?.user || null;

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
    () => posts.map((post) => ({ ...post, healthAiMatchScore: calculateMatchScore(post, user) })),
    [posts, user]
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

  useEffect(() => {
    api("/locations")
      .then(setLocations)
      .catch((caughtError) => setError(caughtError.message));
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
    if (session) {
      localStorage.setItem("health-ai-session", JSON.stringify(session));
    } else {
      localStorage.removeItem("health-ai-session");
    }
  }, [session]);

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

  async function authorized(path, options = {}) {
    return api(path, { ...options, token });
  }

  async function refreshPosts() {
    const query = buildQuery(filters);
    const result = await authorized(`/posts${query ? `?${query}` : ""}`);
    setPosts(result.posts || []);
    if (!selectedPost && result.posts?.length) setSelectedPost(result.posts[0]);
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
      if (!selectedPost && postResult.posts?.length) setSelectedPost(postResult.posts[0]);
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
    setLoading(true);
    setAuthInlineError("");
    setError("");
    setMessage("");
    try {
      const result = await api("/auth/login", { method: "POST", body: loginForm });
      setSession(result);
      setActiveTab(result.user.role === "admin" ? "admin" : "feed");
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
      const { privacyAccepted, ...registerPayload } = registerForm;
      const result = await api("/auth/register", { method: "POST", body: registerPayload });
      setVerificationToken("");
      setView("verify");
      setMessage(result.message || "Account created. Please check your email for the verification token.");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyEmail(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/auth/verify-email", {
        method: "POST",
        body: { token: verificationToken },
      });
      setLoginForm({ email: result.user?.email || registerForm.email, password: registerForm.password });
      setView("login");
      setMessage(result.message || "Email verified.");
    } catch (caughtError) {
      setError(caughtError.message);
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const result = await api("/auth/resend-verification", {
        method: "POST",
        body: { email: registerForm.email },
      });
      setVerificationToken("");
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
    setVerificationToken("");
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

  async function expressInterest() {
    if (!selectedPost) return;
    if (!ndaAcceptedForInterest) {
      setError("Please accept the NDA terms to continue.");
      return;
    }
    setError("");
    setMessage("");
    try {
      await authorized(`/posts/${selectedPost.id}/interests`, {
        method: "POST",
        body: { message: interestDraft.message },
      });
      setInterestDraft({ message: "" });
      setNdaAcceptedForInterest(false);
      setShowNdaModal(false);
      setActiveTab("interests");
      setMessage("Interest expressed. The post owner can now propose time slots.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
    }
  }

  async function proposeInterestSlots(interest) {
    setError("");
    setMessage("");
    try {
      await authorized(`/interests/${interest.id}/time-slots`, {
        method: "POST",
        body: { proposedSlots: splitLines(interestSlotDrafts[interest.id]) },
      });
      setInterestSlotDrafts((current) => ({ ...current, [interest.id]: "" }));
      setMessage("Time slots proposed.");
      await refreshAll();
    } catch (caughtError) {
      setError(caughtError.message);
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

  async function requestMeetingFromInterest(interest) {
    setError("");
    setMessage("");
    try {
      const draft = interestMeetingDrafts[interest.id] || {};
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

  async function sendMeetingRequest() {
    if (!selectedPost) return;
    setError("");
    setMessage("");
    try {
      await authorized("/meetings", {
        method: "POST",
        body: {
          postId: selectedPost.id,
          message: meetingDraft.message,
          ndaAccepted: meetingDraft.ndaAccepted,
          proposedSlots: meetingDraft.proposedSlots.split("\n").map((slot) => slot.trim()).filter(Boolean),
        },
      });
      setMeetingDraft({ message: "", ndaAccepted: false, proposedSlots: "2026-04-22T10:00\n2026-04-22T14:00" });
      setMessage("Meeting request sent.");
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

  async function verifyUser(id) {
    setError("");
    try {
      await authorized(`/admin/users/${id}/verify`, { method: "PATCH" });
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
          <div className="brand-mark">
            <small>Pi-thon Dynamics</small>
          </div>
          <div className="visual-overlay-text">
            <h1>Secure healthcare collaboration platform</h1>
            <p>Built for secure collaboration between clinical and engineering teams.</p>
          </div>
        </section>

        <section className="auth-panel clean-auth-panel">
          {view === "login" && (
            <form className="form-stack auth-form" onSubmit={handleLogin}>
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
              <div className="demo-credentials">
                <strong>Demo Accounts</strong>
                {demoAccounts.map((account) => (
                  <p key={account.email}>
                    {account.role}: <span>{account.email}</span> / <code>{account.password}</code>
                  </p>
                ))}
              </div>
            </form>
          )}

          {view === "register" && (
            <form className="form-stack auth-form" onSubmit={handleRegister}>
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
              <label className="privacy-check">
                <input
                  type="checkbox"
                  checked={registerForm.privacyAccepted}
                  onChange={(event) => {
                    setRegisterInlineError("");
                    setRegisterForm({ ...registerForm, privacyAccepted: event.target.checked });
                  }}
                />
                I agree to the Privacy Policy
              </label>
              {registerInlineError && <p className="auth-inline-error" role="alert">{registerInlineError}</p>}
              <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
              <p className="switch-link">
                Already a Member? <button type="button" className="text-link" onClick={() => setView("login")}>Log In</button>
              </p>
            </form>
          )}

          {view === "verify" && (
            <form className="form-stack auth-form" onSubmit={handleVerifyEmail}>
              <h2>Email verification</h2>
              <p>Check your inbox for the verification token and paste it below. You can resend if needed.</p>
              <Field label="Verification token" value={verificationToken} onChange={setVerificationToken} />
              <div className="form-actions">
                <button type="submit" disabled={loading}>Verify email</button>
                <button type="button" className="ghost-button" onClick={resendVerification} disabled={loading || !registerForm.email}>Resend token</button>
              </div>
              <p className="switch-link">
                Back to <button type="button" className="text-link" onClick={() => setView("login")}>Sign In</button>
              </p>
            </form>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Health AI</p>
          <h2>{user.fullName}</h2>
          <p className="sidebar-copy">{user.role} at {user.institution || "institution not set"}</p>
        </div>
        <nav className="sidebar-nav">
          {[
            ["feed", "Posts"],
            ["interests", "Interests"],
            ["composer", "Announcement Studio"],
            ["meetings", "Meetings"],
            ["notifications", `Notifications ${unreadCount ? `(${unreadCount})` : ""}`],
            ["profile", "Profile"],
          ].map(([tab, label]) => (
            <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>
              {label}
            </button>
          ))}
          {user.role === "admin" && (
            <button className={activeTab === "admin" ? "active" : ""} onClick={() => setActiveTab("admin")}>Admin</button>
          )}
        </nav>
        <div className="sidebar-footer">
          <button className="ghost-button" onClick={logout}>Logout</button>
          <small>by Pi-thon Dynamics</small>
        </div>
      </aside>

      <section className="content">
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
        <header className="topbar">
          <div>
            <h1>{activeTab === "feed" ? "Dashboard" : activeTab === "composer" ? "Create New Announcement" : activeTab === "admin" ? "Admin Command Center" : activeTab[0].toUpperCase() + activeTab.slice(1)}</h1>
          </div>
          <span className="notification-pill">{user.city}, {user.country}</span>
        </header>

        {activeTab === "feed" && (
          <section className="stack">
            <div className="metrics-row">
              <StatCard label="Active posts" value={stats.activePosts} hint="Published opportunities" />
              <StatCard label="My posts" value={stats.ownPosts} hint="Owned by current account" />
              <StatCard label="Interests" value={stats.activeInterests} hint="First-contact flows" />
              <StatCard label="Pending meetings" value={stats.pendingMeetings} hint="Awaiting decision" />
              <StatCard label="Unread" value={unreadCount} hint="Notifications" />
            </div>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Search and filters</h2>
                  <p>Filter by city, country, expertise, domain, stage or lifecycle status.</p>
                </div>
                <button className="ghost-button" onClick={() => setFilters(emptyFilters)}>Clear</button>
              </div>
              <div className="filter-grid">
                <Field label="Search" value={filters.search} onChange={(search) => setFilters({ ...filters, search })} />
                <Field label="Domain" value={filters.domain} onChange={(domain) => setFilters({ ...filters, domain })} />
                <Field label="City" value={filters.city} onChange={(city) => setFilters({ ...filters, city })} />
                <Field label="Expertise" value={filters.expertise} onChange={(expertise) => setFilters({ ...filters, expertise })} />
                <SelectField label="Stage" value={filters.stage} onChange={(stage) => setFilters({ ...filters, stage })} options={[{ value: "", label: "Any" }, ...projectStageOptions]} />
                <SelectField label="Status" value={filters.status} onChange={(status) => setFilters({ ...filters, status })} options={[{ value: "", label: "Any" }, { value: "draft", label: "Draft" }, { value: "active", label: "Active" }, { value: "meeting_scheduled", label: "Meeting scheduled" }, { value: "partner_found", label: "Partner found" }, { value: "expired", label: "Expired" }]} />
              </div>
            </section>
            <section className="dashboard-grid">
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Posts</h2>
                    <p>Select a post to inspect details or start the meeting workflow.</p>
                  </div>
                  <button onClick={() => { resetComposer(); setActiveTab("composer"); }}>New post</button>
                </div>
                <div className="card-grid">
                  {scoredPosts.map((post) => (
                    <article className={`post-card ${selectedPost?.id === post.id ? "selected" : ""} ${post.cityMatch ? "city-match" : ""}`} key={post.id} onClick={() => setSelectedPost(post)}>
                      <div className="card-topline">
                        <span>{post.workingDomain}</span>
                        <StatusBadge status={post.status} />
                      </div>
                      <h3>{post.title}</h3>
                      <p>{post.shortExplanation || post.description || "No summary provided."}</p>
                      <div className="meta-list">
                        <span>{post.requiredExpertise}</span>
                        <span>{post.city}, {post.country}</span>
                        <span>{labelFor(projectStageOptions, post.projectStage)}</span>
                        <span className="score-badge">Match Score {post.healthAiMatchScore}</span>
                        {post.cityMatch && <span>Local match</span>}
                      </div>
                      <small>{post.matchExplanation}</small>
                    </article>
                  ))}
                  {!posts.length && <EmptyState title="No posts found" text="Adjust filters or create the first opportunity." />}
                </div>
              </div>

              <div className="panel detail-panel">
                {selectedPost ? (
                  <>
                    <div className="panel-header">
                      <div>
                        <h2>{selectedPost.title}</h2>
                        <p>{selectedPost.owner?.fullName} at {selectedPost.owner?.institution || "institution not set"}</p>
                      </div>
                      <StatusBadge status={selectedPost.status} />
                    </div>
                    <p>{selectedPost.description || selectedPost.highLevelIdea || "No detailed explanation yet."}</p>
                    <div className="detail-grid">
                      <div><strong>Healthcare need</strong><p>{selectedPost.healthcareNeed || "Not specified"}</p></div>
                      <div><strong>Technical need</strong><p>{selectedPost.technicalNeed || "Not specified"}</p></div>
                      <div><strong>Confidentiality</strong><p>{selectedPost.confidentialityLevel}</p></div>
                      <div><strong>Expires</strong><p>{formatDate(selectedPost.expiryDate)}</p></div>
                    </div>
                    <div className="card-actions">
                      {selectedPost.userId === user.id && <button className="ghost-button" onClick={() => editPost(selectedPost)}>Edit</button>}
                      {selectedPost.userId === user.id && selectedPost.status !== "partner_found" && <button onClick={() => updatePostStatus(selectedPost.id, "partner_found")}>Partner found</button>}
                      {selectedPost.userId === user.id && selectedPost.status !== "expired" && <button className="ghost-button" onClick={() => updatePostStatus(selectedPost.id, "expired")}>Expire</button>}
                      {selectedPost.userId === user.id && <button className="danger-button" onClick={() => deletePost(selectedPost.id)}>Delete</button>}
                    </div>
                    {selectedPost.userId !== user.id && selectedPost.status === "active" && (
                      <div className="meeting-form">
                        <h3>Express interest</h3>
                        <p>Send a short first-contact note and confirm NDA acceptance before proceeding.</p>
                        <TextAreaField label="Short message" value={interestDraft.message} onChange={(messageValue) => setInterestDraft({ message: messageValue })} />
                        <button onClick={() => setShowNdaModal(true)}>Send interest</button>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState title="Open a post" text="Select a post card from the left panel." />
                )}
              </div>
            </section>
          </section>
        )}

        {activeTab === "composer" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>{editingPostId ? "Edit post" : "Create post"}</h2>
                <p>Create a safe announcement in three focused steps.</p>
              </div>
              {editingPostId && <button className="ghost-button" onClick={resetComposer}>Cancel edit</button>}
            </div>
            <div className="composer-steps">
              {studioSteps.map((step, index) => (
                <button key={step.title} className={`step-button ${composerStep === index ? "active" : ""}`} onClick={() => setComposerStep(index)}>
                  <span>{index + 1}</span>
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
                  <label className="checkbox">
                    <input type="checkbox" checked={postForm.autoClose} onChange={(event) => setPostForm({ ...postForm, autoClose: event.target.checked })} />
                    Auto-close when partner found
                  </label>
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="ghost-button" onClick={() => setComposerStep((step) => clampStep(step - 1))} disabled={composerStep === 0}>Back</button>
              <button className="ghost-button" onClick={() => setComposerStep((step) => clampStep(step + 1))} disabled={composerStep === studioSteps.length - 1}>Next</button>
              <button className="ghost-button" onClick={() => savePost("draft")} disabled={loading}>Save draft</button>
              <button onClick={() => savePost("active")} disabled={loading}>Publish</button>
            </div>
          </section>
        )}

        {activeTab === "interests" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Interests</h2>
                <p>Handle first-contact messages before creating a meeting request.</p>
              </div>
            </div>
            <div className="card-grid">
              {interests.map((interest) => {
                const ownerView = interest.ownerId === user.id;
                const requesterView = interest.requesterId === user.id;
                const meetingDraftForInterest = interestMeetingDrafts[interest.id] || {};
                const hasSlots = Boolean(interest.timeSlots?.length);
                return (
                  <article className="meeting-card" key={interest.id}>
                    <div className="card-topline">
                      <span>{interest.post?.workingDomain}</span>
                      <StatusBadge status={interest.status} />
                    </div>
                    <h3>{interest.post?.title}</h3>
                    <p>{interest.message}</p>
                    <div className="meta-list">
                      <span>Requester: {interest.requester?.fullName}</span>
                      <span>Owner: {interest.owner?.fullName}</span>
                      <span>{interest.post?.confidentialityLevel?.replaceAll("_", " ")}</span>
                    </div>
                    {hasSlots && (
                      <div className="slot-list">
                        {interest.timeSlots.map((slot) => (
                          <div className="slot-option" key={slot.id}>
                            <span>{formatDate(slot.proposedAt)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {ownerView && (interest.status === "pending" || interest.status === "acknowledged") && (
                      <div className="meeting-form">
                        <TextAreaField
                          label="Propose time slots"
                          value={interestSlotDrafts[interest.id] || "2026-04-24T10:00\n2026-04-24T13:00"}
                          onChange={(value) => setInterestSlotDrafts((current) => ({ ...current, [interest.id]: value }))}
                        />
                        <button onClick={() => proposeInterestSlots(interest)}>Propose slots</button>
                      </div>
                    )}
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
                        <button onClick={() => requestMeetingFromInterest(interest)}>Send meeting request</button>
                      </div>
                    )}
                    <div className="card-actions">
                      {requesterView && interest.status !== "withdrawn" && interest.status !== "meeting_requested" && (
                        <button className="ghost-button" onClick={() => withdrawInterest(interest)}>Withdraw</button>
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
            <div className="panel-header">
              <div>
                <h2>Meetings</h2>
                <p>Accept selected slots, decline unsuitable requests or confirm a slot when more than one option is still open.</p>
              </div>
            </div>
            <div className="card-grid">
              {meetings.map((meeting) => (
                <article className="meeting-card" key={meeting.id}>
                  <div className="card-topline">
                    <span>{meeting.post?.workingDomain}</span>
                    <StatusBadge status={meeting.status} />
                  </div>
                  <h3>{meeting.post?.title}</h3>
                  <p>{meeting.message || "No message provided."}</p>
                  <div className="meta-list">
                    <span>Requester: {meeting.requester?.fullName}</span>
                    <span>Owner: {meeting.owner?.fullName}</span>
                  </div>
                  <div className="slot-list">
                    {(meeting.timeSlots || []).map((slot) => (
                      <div className="slot-option" key={slot.id}>
                        <span>{formatDate(slot.proposedAt)}</span>
                        {meeting.status === "accepted" && <button className="ghost-button" onClick={() => confirmSlot(meeting, slot.id)}>Confirm</button>}
                      </div>
                    ))}
                  </div>
                  {meeting.selectedSlot && <p>Selected slot: {formatDate(meeting.selectedSlot)}</p>}
                  <div className="card-actions">
                    {meeting.ownerId === user.id && meeting.status === "pending" && <button onClick={() => meetingAction(meeting, "accept")}>{meeting.selectedSlot ? "Accept and schedule" : "Accept"}</button>}
                    {meeting.ownerId === user.id && meeting.status === "pending" && <button className="ghost-button" onClick={() => meetingAction(meeting, "decline")}>Decline</button>}
                    {meeting.requesterId === user.id && meeting.status === "pending" && <button className="ghost-button" onClick={() => meetingAction(meeting, "cancel")}>Cancel</button>}
                  </div>
                </article>
              ))}
              {!meetings.length && <EmptyState title="No meetings yet" text="Meeting requests will appear here after a user expresses interest." />}
            </div>
          </section>
        )}

        {activeTab === "notifications" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Notifications</h2>
                <p>System, verification and meeting updates.</p>
              </div>
              <button onClick={readAllNotifications}>Mark all read</button>
            </div>
            <div className="notification-list">
              {notifications.map((notification) => (
                <article className={`notification-item ${notification.read ? "" : "unread"}`} key={notification.id}>
                  <strong>{notification.type.replaceAll("_", " ")}</strong>
                  <p>{notification.message}</p>
                  <small>{formatDate(notification.createdAt)}</small>
                  <button className="ghost-button" onClick={() => deleteNotification(notification.id)}>Delete</button>
                </article>
              ))}
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
          <section className="stack">
            <div className="metrics-row">
              <StatCard label="Total Projects" value={adminOverview?.activePosts || 0} hint="📁 Live and managed posts" />
              <StatCard label="Verified Experts" value={adminUsers.filter((item) => item.verified).length} hint="✅ Trusted specialist accounts" />
              <StatCard label="Active Meetings" value={meetings.filter((item) => item.status === "scheduled" || item.status === "accepted").length} hint="📅 In-progress collaboration flow" />
              <StatCard label="Security Logs" value={adminOverview?.logsCount || 0} hint="🛡️ Auditable security events" />
            </div>
            <section className="dashboard-grid">
              <article className="panel">
                <h2>Activity Trends</h2>
                <div className="chart-box">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart">
                    <polyline
                      fill="none"
                      stroke="#3e7cb1"
                      strokeWidth="2.4"
                      points={chartSeries([
                        adminOverview?.failedLogins24h || 0,
                        adminOverview?.pendingMeetings || 0,
                        adminOverview?.activePosts || 0,
                        adminUsers.length,
                        adminOverview?.logsCount || 0,
                      ])}
                    />
                  </svg>
                </div>
              </article>
              <article className="panel">
                <h2>Domain Distribution</h2>
                <div className="donut-wrap">
                  <div
                    className="donut-chart"
                    style={{
                      background: `conic-gradient(#3e7cb1 0deg ${Math.max((domainDistribution[0]?.[1] || 1) * 36, 36)}deg, #81a4cd ${Math.max((domainDistribution[0]?.[1] || 1) * 36, 36)}deg 360deg)`,
                    }}
                  />
                  <div className="donut-legend">
                    {(domainDistribution.length ? domainDistribution : [["General", 1]]).map(([domain, count]) => (
                      <p key={domain}>{domain}: {count}</p>
                    ))}
                  </div>
                </div>
              </article>
            </section>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Users</h2>
                  <p>Moderate verification and suspension.</p>
                </div>
              </div>
              <div className="table-wrap users-table-wrap">
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
                          <button className="ghost-button" onClick={() => verifyUser(adminUser.id)}>Verify</button>
                          <button className="ghost-button" onClick={() => suspendUser(adminUser.id, !adminUser.suspended)}>{adminUser.suspended ? "Unsuspend" : "Suspend"}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Posts</h2>
                  <p>Moderate lifecycle and remove inappropriate posts.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Title</th><th>Status</th><th>Owner</th><th>City</th><th>Match Score</th><th>Actions</th></tr></thead>
                  <tbody>
                    {adminPosts.map((post) => (
                      <tr key={post.id}>
                        <td>{post.title}</td>
                        <td><StatusBadge status={post.status} /></td>
                        <td>{post.owner?.fullName}</td>
                        <td>{post.city}</td>
                        <td><span className="score-badge">{calculateMatchScore(post, user)}</span></td>
                        <td>
                          <button className="ghost-button" onClick={() => adminPostStatus(post.id, "active")}>Activate</button>
                          <button className="ghost-button" onClick={() => adminPostStatus(post.id, "expired")}>Expire</button>
                          <button className="danger-button" onClick={() => removePostAsAdmin(post.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Activity logs</h2>
                  <p>Exportable audit trail for the project scope.</p>
                </div>
                <button onClick={exportLogs}>Export CSV</button>
              </div>
              <div className="table-wrap admin-log-wrap">
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
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Security anomalies</h2>
                    <p>Failed login and security-event signals from the last 24 hours.</p>
                  </div>
                </div>
                <div className="detail-grid">
                  <div>
                    <strong>Failed login IPs</strong>
                    <p>{adminAnomalies.failedLoginByIp.length ? adminAnomalies.failedLoginByIp.map((item) => `${item.ipAddress}: ${item.count} (${item.risk})`).join(", ") : "No suspicious IP activity."}</p>
                  </div>
                  <div>
                    <strong>Failed login users</strong>
                    <p>{adminAnomalies.failedLoginByUser.length ? adminAnomalies.failedLoginByUser.map((item) => `${item.userId}: ${item.count} (${item.risk})`).join(", ") : "No repeated user failures."}</p>
                  </div>
                  <div>
                    <strong>Security events</strong>
                    <p>{adminAnomalies.recentSecurityEvents.length ? `${adminAnomalies.recentSecurityEvents.length} recent events` : "No recent security events."}</p>
                  </div>
                  <div>
                    <strong>Window</strong>
                    <p>{adminAnomalies.window}</p>
                  </div>
                </div>
              </section>
            )}
            {adminStats && (
              <section className="panel">
                <h2>Statistics</h2>
                <div className="detail-grid">
                  <div><strong>Roles</strong><p>{adminStats.usersByRole.map((item) => `${item.role}: ${item._count.role}`).join(", ")}</p></div>
                  <div><strong>Post states</strong><p>{adminStats.postsByStatus.map((item) => `${item.status}: ${item._count.status}`).join(", ")}</p></div>
                  <div><strong>Meeting states</strong><p>{adminStats.meetingsByStatus.map((item) => `${item.status}: ${item._count.status}`).join(", ")}</p></div>
                  <div><strong>Cities</strong><p>{adminStats.postsByCity.map((item) => `${item.city}: ${item.count}`).join(", ")}</p></div>
                </div>
              </section>
            )}
          </section>
        )}

        {showNdaModal && (
          <div className="modal-backdrop" role="presentation">
            <div className="nda-modal">
              <h2>NDA Confirmation</h2>
              <p>You must accept confidentiality terms before sending interest for this project.</p>
              <label className="checkbox">
                <input type="checkbox" checked={ndaAcceptedForInterest} onChange={(event) => setNdaAcceptedForInterest(event.target.checked)} />
                I confirm that I will keep all shared details confidential under NDA.
              </label>
              <div className="form-actions">
                <button className="ghost-button" onClick={() => { setShowNdaModal(false); setNdaAcceptedForInterest(false); }}>Cancel</button>
                <button onClick={expressInterest} disabled={!ndaAcceptedForInterest}>Proceed</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
