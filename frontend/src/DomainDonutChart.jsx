import { useEffect, useMemo, useRef } from "react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const PALETTE = ["#3b82f6", "#f59e0b", "#22c55e", "#8b5cf6", "#94a3b8", "#0ea5e9"];

function buildSlices(posts) {
  if (!posts?.length) {
    return [{ label: "No posts yet", value: 1, color: "#e2e8f0" }];
  }
  const map = {};
  posts.forEach((post) => {
    const key = (post.workingDomain || "Other").trim() || "Other";
    map[key] = (map[key] || 0) + 1;
  });
  const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 5);
  const rest = sorted.slice(5).reduce((sum, [, n]) => sum + n, 0);
  const slices = top.map(([label, value], i) => ({
    label,
    value,
    color: PALETTE[i % PALETTE.length],
  }));
  if (rest > 0) {
    slices.push({ label: "Other", value: rest, color: PALETTE[4] });
  }
  return slices;
}

export default function DomainDonutChart({ posts = [] }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  const slices = useMemo(() => buildSlices(posts), [posts]);
  const labels = useMemo(() => slices.map((s) => s.label), [slices]);
  const data = useMemo(() => slices.map((s) => s.value), [slices]);
  const colors = useMemo(() => slices.map((s) => s.color), [slices]);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "#ffffff",
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: {
              boxWidth: 10,
              padding: 12,
              font: { size: 11, weight: "500" },
              color: "#475569",
            },
          },
          tooltip: {
            callbacks: {
              label(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
                const v = ctx.parsed;
                const pct = Math.round((v / total) * 100);
                return ` ${ctx.label}: ${v} (${pct}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [labels, data, colors]);

  return (
    <div className="dash-card dash-card--chart">
      <div className="card-header">
        <div>
          <div className="card-title">Posts by domain</div>
          <div className="card-sub">Top medical / technical fields in the current list</div>
        </div>
      </div>
      <div className="donut-canvas-wrap">
        <canvas ref={canvasRef} role="img" aria-label="Donut chart of posts by working domain." />
      </div>
    </div>
  );
}
