import StatusBadge from "./StatusBadge";

const G = {
  border:   "rgba(255,255,255,0.07)",
  textPrimary: "#e8f3ff",
  textSub:  "#6a96b8",
  textMuted:"#3d6280",
};

export default function AuditTrail({ auditLog, reportId }) {
  if (!auditLog || auditLog.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: G.textMuted, fontSize: 13 }}>
        No status changes yet. Report is in initial state.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        marginBottom: 16, paddingBottom: 12,
        borderBottom: `1px solid ${G.border}`,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="12" height="12" rx="2" stroke={G.textSub} strokeWidth="1.2"/>
          <path d="M4 7h6M4 4.5h6M4 9.5h4" stroke={G.textSub} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <span style={{ fontSize: 12, fontWeight: 600, color: G.textPrimary }}>
          Audit trail — immutable blockchain record
        </span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: G.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
          ID: {reportId?.slice(0, 14)}...
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {auditLog.map((entry, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 0",
            borderBottom: i < auditLog.length - 1 ? `1px solid ${G.border}` : "none",
            flexWrap: "wrap",
          }}>
            <div style={{
              background: "rgba(255,255,255,0.05)",
              border: `1px solid ${G.border}`,
              borderRadius: 7,
              padding: "3px 10px", fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              color: G.textSub, minWidth: 96,
            }}>
              Block {entry.block.toLocaleString()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <StatusBadge status={entry.from}/>
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path d="M1 5h12M10 1l4 4-4 4" stroke={G.textMuted} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <StatusBadge status={entry.to}/>
            </div>
            <span style={{ fontSize: 11, color: G.textMuted, marginLeft: "auto" }}>
              {new Date(entry.time * 1000).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 14, padding: "10px 14px",
        background: "rgba(34,197,94,0.08)",
        border: "1px solid rgba(34,197,94,0.2)",
        borderRadius: 8, fontSize: 11, color: "#4ade80",
        display: "flex", gap: 7, alignItems: "center",
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <circle cx="6" cy="6" r="5" stroke="#22c55e" strokeWidth="1.2"/>
          <path d="M4 6l1.5 1.5L8 4" stroke="#22c55e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        All entries permanently recorded on Sepolia blockchain — tamper-proof
      </div>
    </div>
  );
}
