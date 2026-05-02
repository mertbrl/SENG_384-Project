import { useEffect, useMemo, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

function lastSevenMonths() {
  const now = new Date();
  const items = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    items.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString("en", { month: "short" }),
    });
  }
  return items;
}

function countByMonth(records, getCreatedAt) {
  const map = new Map();
  records.forEach((record) => {
    const raw = getCreatedAt(record);
    if (!raw) return;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

/**
 * Bar chart: posts vs interests (matches) per month — aligned with Downloads/files ActivityChart.jsx
 */
export default function ActivityChart({ posts = [], interests = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const { labels, postCounts, matchCounts, yearTag } = useMemo(() => {
    const months = lastSevenMonths();
    const postMap = countByMonth(posts, (p) => p.createdAt);
    const interestMap = countByMonth(interests, (i) => i.createdAt);
    return {
      labels: months.map((m) => m.label),
      postCounts: months.map((m) => postMap.get(m.key) || 0),
      matchCounts: months.map((m) => interestMap.get(m.key) || 0),
      yearTag: String(new Date().getFullYear()),
    };
  }, [posts, interests]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Posts",
            data: postCounts,
            backgroundColor: "#378ADD",
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.7,
          },
          {
            label: "Matches",
            data: matchCounts,
            backgroundColor: "#639922",
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            bodyFont: { size: 12 },
            titleFont: { size: 12 },
            padding: 10,
          },
        },
        scales: {
          x: {
            ticks: { font: { size: 11 }, color: "#999" },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            ticks: { font: { size: 11 }, color: "#999" },
            grid: { color: "rgba(0,0,0,0.05)" },
            border: { display: false },
            beginAtZero: true,
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, postCounts, matchCounts]);

  return (
    <div className="dash-card">
      <div className="card-header">
        <div>
          <div className="card-title">Post activity — last 7 months</div>
          <div className="card-sub">New posts and interest signals (matches) per month</div>
        </div>
        <span className="card-tag">{yearTag}</span>
      </div>

      <div className="chart-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#378ADD" }} />
          Posts
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "#639922" }} />
          Matches
        </span>
      </div>

      <div className="chart-canvas-wrap">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Bar chart of monthly posts and interest activity."
        />
      </div>
    </div>
  );
}
