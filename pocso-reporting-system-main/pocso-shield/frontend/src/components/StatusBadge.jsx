const STATUS_CONFIG = {
  Pending:     { bg: "rgba(234,179,8,0.1)",   color: "#facc15", border: "rgba(234,179,8,0.25)"   },
  UnderReview: { bg: "rgba(14,165,233,0.1)",  color: "#38bdf8", border: "rgba(14,165,233,0.25)"  },
  Escalated:   { bg: "rgba(239,68,68,0.1)",   color: "#f87171", border: "rgba(239,68,68,0.25)"   },
  Resolved:    { bg: "rgba(34,197,94,0.1)",   color: "#4ade80", border: "rgba(34,197,94,0.25)"   },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.Pending;
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
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: config.color, flexShrink: 0 }}/>
      {status}
    </span>
  );
}
