import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

/**
 * VerifyEmail
 *
 * Route: /verify-email?token=<token>
 *
 * When the user clicks the verification link in their inbox, they land here.
 * This page reads the token from the URL, POSTs it to the backend,
 * shows success / error, and redirects to /login after 3 seconds.
 *
 * Add to your router:
 *   <Route path="/verify-email" element={<VerifyEmail />} />
 */
export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the URL.");
      return;
    }

    fetch(`${BASE_URL}/api/auth/verify-email?token=${token}`, {
      method: "POST",
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
          setTimeout(() => navigate("/login"), 3000);
        } else {
          const body = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(body.detail || "Verification failed. The link may have expired.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not reach the server. Please try again later.");
      });
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M11 2v18M2 11h18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="11" cy="11" r="4.5" stroke="#fff" strokeWidth="2" />
            </svg>
          </div>
          <span style={styles.logoText}>HEALTH AI</span>
        </div>

        {status === "verifying" && (
          <>
            <div style={styles.spinner} />
            <h2 style={styles.h2}>Verifying your email…</h2>
            <p style={styles.p}>Please wait a moment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ ...styles.iconCircle, background: "#eaf3de" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 14l6 6L22 8" stroke="#3B6D11" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 style={{ ...styles.h2, color: "#3B6D11" }}>Email verified!</h2>
            <p style={styles.p}>
              Your account is now active. Redirecting to login in 3 seconds…
            </p>
            <button style={styles.btn} onClick={() => navigate("/login")}>
              Go to Login
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ ...styles.iconCircle, background: "#fcebeb" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M8 8l12 12M20 8L8 20" stroke="#A32D2D" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{ ...styles.h2, color: "#A32D2D" }}>Verification failed</h2>
            <p style={styles.p}>{message}</p>
            <button
              style={{ ...styles.btn, background: "#E24B4A" }}
              onClick={() => navigate("/register")}
            >
              Register again
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── inline styles ─────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  card: {
    background: "#fff",
    border: "1px solid #eaecf0",
    borderRadius: 16,
    padding: "40px 48px",
    maxWidth: 420,
    width: "100%",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 28,
  },
  logoIcon: {
    width: 40,
    height: 40,
    background: "#185FA5",
    borderRadius: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a2e",
    letterSpacing: "0.03em",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 16px",
  },
  h2: {
    fontSize: 20,
    fontWeight: 700,
    color: "#1a1a2e",
    margin: "0 0 10px",
  },
  p: {
    fontSize: 14,
    color: "#666",
    lineHeight: 1.6,
    margin: "0 0 24px",
  },
  btn: {
    display: "inline-block",
    background: "#185FA5",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  spinner: {
    width: 44,
    height: 44,
    border: "3px solid #e6f1fb",
    borderTop: "3px solid #185FA5",
    borderRadius: "50%",
    animation: "spin 0.9s linear infinite",
    margin: "0 auto 20px",
  },
};

// inject spinner keyframes once
if (typeof document !== "undefined" && !document.getElementById("ve-spin")) {
  const s = document.createElement("style");
  s.id = "ve-spin";
  s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}
