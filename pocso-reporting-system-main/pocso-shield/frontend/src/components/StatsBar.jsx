const G = {
  navyCard: "#0f2035",
  border:   "rgba(255,255,255,0.07)",
  textPrimary: "#e8f3ff",
  textSub:  "#6a96b8",
  textMuted:"#3d6280",
};

export default function StatsBar({ reports }) {
  const total       = reports.length;
  const critical    = reports.filter((r) => r.riskScore >= 85).length;
  const escalated   = reports.filter((r) => r.status === "Escalated").length;
  const resolved    = reports.filter((r) => r.status === "Resolved").length;
  const pending     = reports.filter((r) => r.status === "Pending").length;
  const resolvedPct = total ? Math.round((resolved / total) * 100) : 0;

  const stats = [
    { label: "Total reports",      value: total,          color: G.textPrimary, accent: null },
    { label: "Critical (≥ 85)",    value: critical,       color: critical > 0 ? "#f87171" : G.textPrimary, accent: critical > 0 ? "rgba(239,68,68,0.15)" : null, border: critical > 0 ? "rgba(239,68,68,0.2)" : null },
    { label: "Escalated",          value: escalated,      color: escalated > 0 ? "#fb923c" : G.textPrimary, accent: escalated > 0 ? "rgba(249,115,22,0.12)" : null, border: escalated > 0 ? "rgba(249,115,22,0.2)" : null },
    { label: "Pending review",     value: pending,        color: G.textPrimary, accent: null },
    { label: "Resolved",           value: resolved,       color: G.textPrimary, accent: null },
    { label: "Resolution rate",    value: resolvedPct + "%", color: resolvedPct > 50 ? "#4ade80" : G.textPrimary, accent: resolvedPct > 50 ? "rgba(34,197,94,0.1)" : null, border: resolvedPct > 50 ? "rgba(34,197,94,0.2)" : null },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: 10,
      marginBottom: 26,
    }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: s.accent || G.navyCard,
          border: `1px solid ${s.border || G.border}`,
          borderRadius: 12,
          padding: "16px 18px",
          transition: "all 0.2s",
        }}>
          <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {s.label}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: s.color, fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}
