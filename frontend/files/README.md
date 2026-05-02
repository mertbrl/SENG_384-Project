# HEALTH AI Dashboard – Frontend Components

## File structure

```
src/
├── components/
│   ├── Dashboard.jsx       ← main dashboard page (layout + data)
│   ├── Dashboard.css       ← all dashboard styles
│   ├── Sidebar.jsx         ← left navigation bar
│   ├── MetricCard.jsx      ← summary stat cards (top row)
│   ├── ActivityChart.jsx   ← bar chart (Chart.js)
│   ├── DomainChart.jsx     ← doughnut chart (Chart.js)
│   ├── StatusBreakdown.jsx ← post status progress bars
│   └── RecentActivity.jsx  ← event feed
├── hooks/
│   ├── useDashboardStats.js ← fetches real API data (GET /api/v1/admin/stats)
│   └── useDashboardStats.js ← useUnreadNotifications polling hook
└── pages/
    └── VerifyEmail.jsx     ← /verify-email?token=... page
```

## 1. Install dependencies

```bash
npm install chart.js react-router-dom
```

## 2. Add routes (App.jsx)

```jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard   from "./components/Dashboard";
import VerifyEmail from "./pages/VerifyEmail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/dashboard"    element={<Dashboard />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

## 3. Set API base URL (.env)

```env
VITE_API_URL=http://localhost:5001
```

## 4. Connect real API data

In `Dashboard.jsx`, replace the inline mock arrays with the hook:

```jsx
import { useDashboardStats } from "../hooks/useDashboardStats";

export default function Dashboard() {
  const { data, loading } = useDashboardStats();

  // use data.posts.active instead of hardcoded 87, etc.
  const metrics = data ? [
    { label: "Registered Users",   value: data.users.total,              change: `+${data.users.new_this_month} this month`,  trend: "up", color: "#185FA5", bg: "#E6F1FB", icon: "users"    },
    { label: "Active Posts",        value: data.posts.active,             change: `+${data.posts.new_this_week} this week`,    trend: "up", color: "#3B6D11", bg: "#EAF3DE", icon: "posts"    },
    { label: "Meetings Scheduled",  value: data.meetings.scheduled,       change: `+${data.meetings.new_this_week} this week`, trend: "up", color: "#3C3489", bg: "#EEEDFE", icon: "meetings" },
    { label: "Successful Matches",  value: data.matches.total,            change: `+${data.matches.new_this_month} this month`,trend: "up", color: "#854F0B", bg: "#FAEEDA", icon: "matches"  },
  ] : METRICS; // METRICS = fallback mock

  if (loading) return <div className="dash-layout"><p>Loading…</p></div>;
  // rest of JSX unchanged
}
```

## 5. Fix email verification – backend

In your FastAPI email service, remove the plain-text token from the e-mail body.
Only keep the HTML button:

```python
# email_service.py
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

def send_verification_email(email: str, token: str, name: str):
    verify_url = f"{FRONTEND_URL}/verify-email?token={token}"
    html = f"""
    <div style="font-family:Arial;max-width:600px;margin:0 auto;">
      <h2 style="color:#1F3864;">Verify your Health AI account</h2>
      <p>Hello {name},</p>
      <p>Click the button below to verify your email address:</p>
      <a href="{verify_url}"
         style="background:#185FA5;color:#fff;padding:13px 26px;
                border-radius:10px;text-decoration:none;
                display:inline-block;font-weight:600;">
        Verify Email
      </a>
      <p style="color:#aaa;font-size:12px;margin-top:28px;">
        This link expires in 24 hours. Do not share it.
      </p>
    </div>
    """
    # do NOT include the raw token string anywhere in the email body
    send(to=email, subject="Health AI – Verify your email", html=html)
```
