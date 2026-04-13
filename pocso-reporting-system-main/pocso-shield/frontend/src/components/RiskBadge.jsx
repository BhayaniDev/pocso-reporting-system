export default function RiskBadge({ score }) {
  const config =
    score >= 85 ? { bg: "rgba(239,68,68,0.12)",   color: "#f87171", border: "rgba(239,68,68,0.25)",   label: "CRITICAL"   } :
    score >= 60 ? { bg: "rgba(249,115,22,0.12)",  color: "#fb923c", border: "rgba(249,115,22,0.25)",  label: "HIGH"       } :
    score >= 35 ? { bg: "rgba(234,179,8,0.12)",   color: "#facc15", border: "rgba(234,179,8,0.25)",   label: "SUSPICIOUS" } :
                  { bg: "rgba(34,197,94,0.1)",    color: "#4ade80", border: "rgba(34,197,94,0.25)",   label: "LOW"        };

  return (
    <span style={{
      background:   config.bg,
      color:        config.color,
      border:       `1px solid ${config.border}`,
      padding:      "3px 10px",
      borderRadius: 20,
      fontSize:     11,
      fontWeight:   600,
      whiteSpace:   "nowrap",
      display:      "inline-flex",
      alignItems:   "center",
      gap:          5,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: "50%",
        background: config.color,
        display: "inline-block",
      }}/>
      {score} — {config.label}
    </span>
  );
}
