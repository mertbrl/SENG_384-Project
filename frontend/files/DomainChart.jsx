import { useEffect, useRef } from "react";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const DOMAIN_DATA = [
  { label: "Cardiology",   value: 27, color: "#378ADD", pct: "31%" },
  { label: "Radiology",    value: 19, color: "#639922", pct: "22%" },
  { label: "Neurology",    value: 16, color: "#534AB7", pct: "18%" },
  { label: "Orthopaedics", value: 10, color: "#BA7517", pct: "11%" },
  { label: "Other",        value: 15, color: "#B4B2A9", pct: "17%" },
];

export default function DomainChart() {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: "doughnut",
      data: {
        labels: DOMAIN_DATA.map((d) => d.label),
        datasets: [
          {
            data: DOMAIN_DATA.map((d) => d.value),
            backgroundColor: DOMAIN_DATA.map((d) => d.color),
            borderWidth: 3,
            borderColor: "#fff",
            hoverBorderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { display: false },
          tooltip: {
            bodyFont:  { size: 12 },
            titleFont: { size: 12 },
            padding: 10,
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
          <div className="card-title">Posts by domain</div>
          <div className="card-sub">Top medical fields</div>
        </div>
      </div>

      <div style={{ position: "relative", height: 150, marginBottom: 14 }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Doughnut chart showing distribution of posts by medical domain."
        >
          Cardiology 31%, Radiology 22%, Neurology 18%, Orthopaedics 11%, Other 17%.
        </canvas>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {DOMAIN_DATA.map((d) => (
          <div
            key={d.label}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span
              className="legend-dot-circle"
              style={{ background: d.color }}
            />
            <span style={{ fontSize: 12, color: "#555", flex: 1 }}>
              {d.label}
            </span>
            <span style={{ fontSize: 12, color: "#999", fontWeight: 600 }}>
              {d.pct}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
