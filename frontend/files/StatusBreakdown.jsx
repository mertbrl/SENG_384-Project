export default function StatusBreakdown({ data }) {
  return (
    <div className="dash-card">
      <div className="card-header">
        <div>
          <div className="card-title">Post status breakdown</div>
          <div className="card-sub">All posts on platform</div>
        </div>
      </div>

      <div className="status-list">
        {data.map((item) => (
          <div key={item.label} className="status-row">
            <span className={`status-badge badge-${item.badge}`}>
              {item.badge === "scheduled" ? "Scheduled" : item.label.split(" ")[0]}
            </span>
            <span className="status-label">{item.label}</span>
            <div className="status-bar-bg">
              <div
                className="status-bar-fill"
                style={{ width: `${item.pct}%`, background: item.color }}
              />
            </div>
            <span className="status-count">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
