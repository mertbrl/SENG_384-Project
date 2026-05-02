import { useState, useEffect } from "react";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

/**
 * useDashboardStats
 * Fetches real platform statistics from the FastAPI backend.
 * Falls back to mock data if the API is unavailable.
 *
 * Backend endpoint expected:
 *   GET /api/v1/admin/stats
 *   Authorization: Bearer <jwt>
 *
 * Expected response shape:
 * {
 *   users:    { total: 142, new_this_month: 12 },
 *   posts:    { active: 87, draft: 12, meeting_scheduled: 34,
 *               closed: 21, expired: 7, new_this_week: 8 },
 *   meetings: { scheduled: 34, new_this_week: 5 },
 *   matches:  { total: 21, new_this_month: 3 },
 *   activity: [ { text, detail, time, role, color } ],
 *   monthly:  { labels: [...], posts: [...], matches: [...] },
 *   domains:  [ { label, value, color, pct } ],
 * }
 */
export function useDashboardStats() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchStats() {
      try {
        setLoading(true);
        const token = localStorage.getItem("access_token");

        const res = await fetch(`${BASE_URL}/api/v1/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        setData(json);
        setError(null);
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("Dashboard stats fetch failed, using mock data:", err.message);
        setError(err.message);
        // keep data null so Dashboard falls back to its inline mock
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60_000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}

/**
 * useUnreadNotifications
 * Polls the backend every 30 seconds for unread notification count.
 */
export function useUnreadNotifications() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function poll() {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${BASE_URL}/api/v1/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const { count: c } = await res.json();
        setCount(c);
      } catch {
        // silently ignore – notifications are non-critical
      }
    }

    poll();
    const interval = setInterval(poll, 30_000);
    return () => clearInterval(interval);
  }, []);

  return { count, clear: () => setCount(0) };
}
