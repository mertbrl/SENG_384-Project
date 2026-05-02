export default function RecentActivity({ data }) {
  return (
    <div className="dash-card">
      <div className="card-header">
        <div>
          <div className="card-title">Recent activity</div>
          <div className="card-sub">Latest platform events</div>
        </div>
      </div>

      <div className="activity-list">
        {data.map((item, i) => (
          <div key={i} className="activity-item">
            <div className="act-dot" style={{ background: item.color }} />
            <div>
              <div className="act-text">
                {item.text} —{" "}
                <span className="act-detail">{item.detail}</span>
              </div>
              <div className="act-time">
                {item.time} · {item.role}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
