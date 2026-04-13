import { useState, useEffect, useCallback } from "react";
import StatsBar    from "../components/StatsBar";
import RiskBadge   from "../components/RiskBadge";
import StatusBadge from "../components/StatusBadge";
import AuditTrail  from "../components/AuditTrail";

const BACKEND        = "http://localhost:4000";
const STATUS_OPTIONS = ["Pending", "UnderReview", "Escalated", "Resolved"];
const FILTERS        = ["All", ...STATUS_OPTIONS];

const G = {
  navy:     "#07111f",
  navyCard: "#0f2035",
  navyHover:"#142843",
  teal:     "#0ea5e9",
  tealGlow: "#38bdf8",
  red:      "#ef4444",
  green:    "#22c55e",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(14,165,233,0.3)",
  textPrimary: "#e8f3ff",
  textSub:  "#6a96b8",
  textMuted:"#3d6280",
};

const SEVERITY_COLORS = {
  CRITICAL: { bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)",  text: "#f87171", dot: "#ef4444" },
  HIGH:     { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)", text: "#fb923c", dot: "#f97316" },
  MEDIUM:   { bg: "rgba(234,179,8,0.1)",  border: "rgba(234,179,8,0.25)",  text: "#facc15", dot: "#eab308" },
  LOW:      { bg: "rgba(34,197,94,0.1)",  border: "rgba(34,197,94,0.25)",  text: "#4ade80", dot: "#22c55e" },
  NONE:     { bg: "rgba(255,255,255,0.04)", border: G.border,              text: G.textSub, dot: G.textMuted },
};

function SeverityPill({ severity, label }) {
  const c = SEVERITY_COLORS[severity] || SEVERITY_COLORS.NONE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot, flexShrink: 0 }}/>
      {label || severity}
    </span>
  );
}

function ThreatAlertsPanel({ alerts, onResolve }) {
  const active = alerts.filter((a) => !a.resolved);
  if (active.length === 0) return null;

  return (
    <div style={{
      background: G.navyCard,
      border: "1px solid rgba(239,68,68,0.25)",
      borderRadius: 14, padding: "20px 24px", marginBottom: 22,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15,
        }}>🚨</div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f87171" }}>Threat Alerts</h3>
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: G.red, color: "#fff",
          borderRadius: 10, padding: "1px 8px",
        }}>{active.length}</span>
        <span style={{ fontSize: 12, color: G.textSub, marginLeft: "auto" }}>
          Suspicious access attempts & critical pattern matches
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {active.slice(0, 8).map((alert) => {
          const c = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.NONE;
          return (
            <div key={alert.id} style={{
              display: "flex", alignItems: "flex-start", gap: 12,
              padding: "12px 16px", borderRadius: 10,
              background: c.bg, border: `1px solid ${c.border}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <SeverityPill severity={alert.severity}/>
                  <span style={{ fontSize: 13, fontWeight: 600, color: G.textPrimary }}>{alert.label}</span>
                </div>
                {alert.detail && (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: G.textSub }}>{alert.detail}</p>
                )}
                <p style={{ margin: "2px 0 0", fontSize: 11, color: G.textMuted }}>
                  {new Date(alert.timestamp).toLocaleString("en-IN")}
                </p>
              </div>
              <button
                onClick={() => onResolve(alert.id)}
                style={{
                  flexShrink: 0, padding: "5px 12px", fontSize: 11, fontWeight: 600,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${G.border}`,
                  borderRadius: 7, cursor: "pointer", color: G.textSub,
                  transition: "all 0.2s",
                }}
              >Resolve</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OffendersPanel({ offenders }) {
  if (!offenders || offenders.length === 0) return null;
  return (
    <div style={{
      background: G.navyCard,
      border: "1px solid rgba(234,179,8,0.2)",
      borderRadius: 14, padding: "20px 24px", marginBottom: 22,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "rgba(234,179,8,0.1)",
          border: "1px solid rgba(234,179,8,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15,
        }}>🔁</div>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#facc15" }}>Flagged Repeat Offenders</h3>
        <span style={{ fontSize: 12, color: G.textSub, marginLeft: "auto" }}>Domains with ≥ 2 reports</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.03)" }}>
              {["Domain", "Reports", "Avg Score", "First Seen", "Last Seen", "Status"].map((h) => (
                <th key={h} style={{
                  padding: "9px 14px", textAlign: "left",
                  color: G.textMuted, fontWeight: 600, fontSize: 10,
                  borderBottom: `1px solid ${G.border}`,
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {offenders.map((o, i) => (
              <tr key={o.domain} style={{ borderTop: i > 0 ? `1px solid ${G.border}` : "none" }}>
                <td style={{ padding: "11px 14px", fontFamily: "'JetBrains Mono', monospace", color: G.textPrimary }}>{o.domain}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{ fontWeight: 700, color: o.reportCount >= 3 ? "#f87171" : "#fb923c" }}>
                    {o.reportCount}
                  </span>
                </td>
                <td style={{ padding: "11px 14px" }}><RiskBadge score={o.averageScore}/></td>
                <td style={{ padding: "11px 14px", color: G.textSub }}>{new Date(o.firstSeen).toLocaleDateString("en-IN")}</td>
                <td style={{ padding: "11px 14px", color: G.textSub }}>{new Date(o.lastSeen).toLocaleDateString("en-IN")}</td>
                <td style={{ padding: "11px 14px" }}>
                  {o.isRepeatOffender
                    ? <SeverityPill severity="HIGH" label="Repeat Offender"/>
                    : <SeverityPill severity="MEDIUM" label="Monitored"/>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [reports,   setReports]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [filter,    setFilter]    = useState("All");
  const [sortBy,    setSortBy]    = useState("riskScore");
  const [selected,  setSelected]  = useState(null);
  const [updating,  setUpdating]  = useState(null);
  const [alerts,    setAlerts]    = useState([]);
  const [offenders, setOffenders] = useState([]);
  const [activeTab, setActiveTab] = useState("reports");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const res = await fetch(`${BACKEND}/reports`);
      if (!res.ok) throw new Error(await res.text());
      setReports(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/threats/alerts`);
      if (res.ok) setAlerts((await res.json()).alerts || []);
    } catch {}
  }, []);

  const fetchOffenders = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/moderation/offenders`);
      if (res.ok) setOffenders((await res.json()).offenders || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchReports(); fetchAlerts(); fetchOffenders();
    const interval = setInterval(() => { fetchReports(); fetchAlerts(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchReports, fetchAlerts, fetchOffenders]);

  async function handleStatusChange(reportId, newStatus) {
    const idx = STATUS_OPTIONS.indexOf(newStatus);
    if (idx === -1) return;
    setUpdating(reportId);
    try {
      const res = await fetch(`${BACKEND}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId, statusIndex: idx }),
      });
      if (!res.ok) throw new Error(await res.text());
      await fetchReports();
    } catch (err) { alert("Failed to update status: " + err.message); }
    finally { setUpdating(null); }
  }

  async function handleResolveAlert(alertId) {
    try {
      await fetch(`${BACKEND}/threats/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, resolved: true } : a));
    } catch {}
  }

  const filtered = reports
    .filter((r) => filter === "All" || r.status === filter)
    .sort((a, b) => sortBy === "riskScore" ? b.riskScore - a.riskScore : b.timestamp - a.timestamp);

  const selectedReport = reports.find((r) => r.id === selected);
  const activeAlerts   = alerts.filter((a) => !a.resolved);

  return (
    <div style={{ padding: "32px 28px 80px", maxWidth: 1240, margin: "0 auto" }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 28, gap: 14, flexWrap: "wrap", animation: "fadeUp 0.4s ease" }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: G.textPrimary, margin: "0 0 5px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.02em" }}>
            Authority Dashboard
          </h1>
          <p style={{ fontSize: 13, color: G.textSub, margin: 0 }}>
            All data read from Polygon blockchain — tamper-proof and auditable
          </p>
        </div>

        {activeAlerts.length > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 14px", borderRadius: 10,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
            fontSize: 12, fontWeight: 600, color: "#f87171",
          }}>
            🚨 {activeAlerts.length} active threat alert{activeAlerts.length !== 1 ? "s" : ""}
          </div>
        )}

        <button
          onClick={() => { fetchReports(); fetchAlerts(); fetchOffenders(); }}
          disabled={loading}
          style={{
            padding: "9px 18px", fontSize: 13, fontWeight: 500,
            background: G.navyCard,
            border: `1px solid ${G.border}`,
            borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
            color: G.textSub,
            display: "flex", alignItems: "center", gap: 7,
            transition: "all 0.2s",
          }}
        >
          {loading ? (
            <>
              <span style={{ display: "inline-block", width: 12, height: 12, border: `2px solid ${G.border}`, borderTopColor: G.teal, borderRadius: "50%", animation: "spin 0.7s linear infinite" }}/>
              Loading...
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M11.5 6.5A5 5 0 1 1 6.5 1.5" stroke={G.textSub} strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M11.5 1.5v5h-5" fill={G.textSub}/>
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      {!loading && <StatsBar reports={reports}/>}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 12, padding: "14px 18px", marginBottom: 20,
          fontSize: 13, color: "#f87171",
        }}>
          <strong>Error loading reports:</strong> {error}
        </div>
      )}

      <ThreatAlertsPanel alerts={alerts} onResolve={handleResolveAlert}/>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 2, marginBottom: 20, borderBottom: `1px solid ${G.border}` }}>
        {[
          { id: "reports",   label: "Reports",          count: reports.length },
          { id: "offenders", label: "Repeat Offenders", count: offenders.length, highlight: offenders.some((o) => o.isRepeatOffender) },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "10px 18px", fontSize: 13, fontWeight: activeTab === tab.id ? 600 : 400,
              background: "none", border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${G.teal}` : "2px solid transparent",
              marginBottom: "-1px",
              cursor: "pointer",
              color: activeTab === tab.id ? G.tealGlow : G.textSub,
              display: "flex", alignItems: "center", gap: 7,
              transition: "all 0.2s",
            }}
          >
            {tab.label}
            {tab.count > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, borderRadius: 10,
                padding: "1px 7px",
                background: tab.highlight ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.06)",
                color: tab.highlight ? "#facc15" : G.textSub,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Offenders tab */}
      {activeTab === "offenders" && <OffendersPanel offenders={offenders}/>}

      {/* Reports tab */}
      {activeTab === "reports" && (
        <>
          {/* Filter + sort */}
          <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px", fontSize: 12,
                  fontWeight: filter === f ? 600 : 400,
                  background: filter === f ? G.teal : G.navyCard,
                  color: filter === f ? "#fff" : G.textSub,
                  border: `1px solid ${filter === f ? G.teal : G.border}`,
                  borderRadius: 20, cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >{f}</button>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: G.textMuted }}>Sort:</span>
              {[["riskScore", "Risk Score"], ["timestamp", "Newest"]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setSortBy(val)}
                  style={{
                    padding: "6px 12px", fontSize: 12,
                    fontWeight: sortBy === val ? 600 : 400,
                    background: sortBy === val ? "rgba(14,165,233,0.12)" : G.navyCard,
                    border: `1px solid ${sortBy === val ? G.borderHi : G.border}`,
                    color: sortBy === val ? G.tealGlow : G.textSub,
                    borderRadius: 8, cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: G.navyCard, border: `1px solid ${G.border}`,
            borderRadius: 14, overflow: "hidden", marginBottom: 22,
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "rgba(255,255,255,0.03)" }}>
                <tr>
                  {["Report ID", "Filed", "Risk Score", "Moderation", "Status", "TX Hash", "Actions"].map((h) => (
                    <th key={h} style={{
                      padding: "12px 16px", textAlign: "left",
                      fontSize: 10, fontWeight: 600, color: G.textMuted,
                      borderBottom: `1px solid ${G.border}`,
                      textTransform: "uppercase", letterSpacing: "0.1em",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: G.textMuted, fontSize: 13 }}>
                    Reading from blockchain...
                  </td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: 48, textAlign: "center", color: G.textMuted, fontSize: 13 }}>
                    No reports found.
                  </td></tr>
                )}
                {!loading && filtered.map((r, i) => {
                  const isSelected = selected === r.id;
                  const isUpdating = updating === r.id;
                  const modLabel =
                    r.riskScore >= 85 ? "CRITICAL — Immediate Action" :
                    r.riskScore >= 65 ? "HIGH — Priority Review"      :
                    r.riskScore >= 40 ? "MEDIUM — Standard Queue"     : "LOW — Routine Check";
                  const modSeverity =
                    r.riskScore >= 85 ? "CRITICAL" :
                    r.riskScore >= 65 ? "HIGH"     :
                    r.riskScore >= 40 ? "MEDIUM"   : "LOW";

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(isSelected ? null : r.id)}
                      style={{
                        borderTop: i > 0 ? `1px solid ${G.border}` : "none",
                        background: isSelected ? "rgba(14,165,233,0.07)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: G.textSub }}>
                          {r.id.slice(0, 10)}...
                        </span>
                        {r.riskScore >= 85 && (
                          <span style={{ display: "block", fontSize: 9, color: "#f87171", fontWeight: 700, marginTop: 3, letterSpacing: "0.06em" }}>⚡ AUTO-ESCALATED</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: G.textSub }}>
                        {new Date(r.timestamp * 1000).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "12px 16px" }}><RiskBadge score={r.riskScore}/></td>
                      <td style={{ padding: "12px 16px" }}>
                        <SeverityPill severity={modSeverity} label={modLabel.split("—")[0].trim()}/>
                      </td>
                      <td style={{ padding: "12px 16px" }}><StatusBadge status={r.status}/></td>
                      <td style={{ padding: "12px 16px" }}>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${r.txHash}`}
                          target="_blank" rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {r.txHash.slice(0, 12)}... ↗
                        </a>
                      </td>
                      <td style={{ padding: "12px 16px" }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={r.status}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          style={{
                            fontSize: 12, padding: "6px 10px", borderRadius: 8,
                            border: `1px solid ${G.border}`,
                            background: G.navy,
                            color: G.textSub, width: "100%",
                            cursor: isUpdating ? "not-allowed" : "pointer",
                            opacity: isUpdating ? 0.5 : 1,
                          }}
                        >
                          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {isUpdating && (
                          <p style={{ fontSize: 10, color: G.textMuted, margin: "3px 0 0" }}>Writing to chain...</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Audit trail */}
          {selectedReport && (
            <div style={{
              background: G.navyCard, border: `1px solid ${G.borderHi}`,
              borderRadius: 14, padding: "22px 26px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: G.textPrimary }}>Case details</h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: G.textSub }}>
                    IPFS evidence:&nbsp;
                    <a href={`https://ipfs.io/ipfs/${selectedReport.ipfsHash}`} target="_blank" rel="noreferrer">
                      {selectedReport.ipfsHash} ↗
                    </a>
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: "none", border: "none", fontSize: 20, color: G.textMuted, cursor: "pointer", padding: "0 6px", lineHeight: 1 }}
                >×</button>
              </div>
              <AuditTrail auditLog={selectedReport.auditLog} reportId={selectedReport.id}/>
            </div>
          )}
        </>
      )}

      <p style={{ fontSize: 11, color: G.textMuted, textAlign: "center", marginTop: 36 }}>
        All report statuses are written to Polygon Mumbai blockchain · Smart contract: {process.env.REACT_APP_CONTRACT_ADDRESS || "see backend/.env"}
      </p>
    </div>
  );
}
