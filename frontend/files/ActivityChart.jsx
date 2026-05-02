import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const MONTHS  = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];
const POSTS   = [8, 12, 9, 15, 18, 22, 24];
const MATCHES = [1,  2,  2,  3,  4,  5,  4];

export default function ActivityChart() {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: "Posts",
            data: POSTS,
            backgroundColor: "#378ADD",
            borderRadius: 5,
            borderSkipped: false,
            barPercentage: 0.55,
            categoryPercentage: 0.7,
          },
          {
            label: "Matches",
            data: MATCHES,
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
            bodyFont:  { size: 12 },
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
            ticks: { font: { size: 11 }, color: "#999", stepSize: 5 },
            grid: { color: "rgba(0,0,0,0.05)" },
            border: { display: false },
          },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, []);

  return (
    <div className="dash-card">
      <div className="card-header">
        <div>
          <div className="card-title">Post activity — last 7 months</div>
          <div className="card-sub">New posts and successful matches per month</div>
        </div>
        <span className="card-tag">2026</span>
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

      <div style={{ position: "relative", height: 190 }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Bar chart showing monthly post creation and successful matches."
        >
          Monthly posts: Oct 8, Nov 12, Dec 9, Jan 15, Feb 18, Mar 22, Apr 24.
          Matches: 1, 2, 2, 3, 4, 5, 4.
        </canvas>
      </div>
    </div>
  );
}
