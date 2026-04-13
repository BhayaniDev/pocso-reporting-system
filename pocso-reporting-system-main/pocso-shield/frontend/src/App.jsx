import { useState } from "react";
import ReportPage    from "./pages/ReportPage";
import DashboardPage from "./pages/DashboardPage";

export const G = {
  navy:     "#07111f",
  navyMid:  "#0b1829",
  navyCard: "#0f2035",
  navyHover:"#142843",
  teal:     "#0ea5e9",
  tealGlow: "#38bdf8",
  red:      "#ef4444",
  redDim:   "#dc2626",
  green:    "#22c55e",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(14,165,233,0.35)",
  textPrimary: "#e8f3ff",
  textSub:  "#6a96b8",
  textMuted:"#3d6280",
};

export default function App() {
  const [page, setPage] = useState("report");

  return (
    <div style={{ minHeight: "100vh", background: G.navy, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: G.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07111f; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #07111f; }
        ::-webkit-scrollbar-thumb { background: #1a3a5c; border-radius: 4px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; box-shadow:0 0 8px #22c55e; } 50% { opacity:0.6; box-shadow:0 0 3px #22c55e; } }
        @keyframes scanline { 0% { top: -2px; } 100% { top: 100%; } }
        input, textarea, select, button { font-family: 'DM Sans', 'Segoe UI', sans-serif; }
        input::placeholder, textarea::placeholder { color: #3d6280; }
        input:focus, textarea:focus { outline: none; }
        a { color: #38bdf8; text-decoration: none; transition: color 0.2s; }
        a:hover { color: #7dd3fc; }
        .nav-btn { transition: all 0.2s; }
        .nav-btn:hover { background: rgba(14,165,233,0.08) !important; color: #e8f3ff !important; }
        .card-hover:hover { border-color: rgba(14,165,233,0.2) !important; transform: translateY(-1px); }
        .card-hover { transition: all 0.2s; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        background: "rgba(11,24,41,0.92)",
        borderBottom: `1px solid ${G.border}`,
        padding: "0 36px",
        display: "flex",
        alignItems: "center",
        height: 58,
        gap: 4,
        position: "sticky",
        top: 0,
        zIndex: 200,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}>
        {/* Logo */}
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 17,
          color: G.textPrimary,
          marginRight: 28,
          display: "flex",
          alignItems: "center",
          gap: 9,
          letterSpacing: "-0.02em",
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 18px rgba(239,68,68,0.35)",
            flexShrink: 0,
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M7.5 1.5L2 4v4c0 3 2.5 5.5 5.5 6 3-0.5 5.5-3 5.5-6V4L7.5 1.5z" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" fill="rgba(255,255,255,0.15)"/>
            </svg>
          </div>
          <span>POCSO<span style={{ color: G.tealGlow }}>Shield</span></span>
          <span style={{
            fontSize: 9, fontWeight: 600,
            background: "rgba(14,165,233,0.12)",
            color: G.teal,
            border: `1px solid rgba(14,165,233,0.25)`,
            borderRadius: 4,
            padding: "2px 7px",
            letterSpacing: "0.1em",
          }}>BETA</span>
        </div>

        {[
          { key: "report",    label: "Report Content" },
          { key: "dashboard", label: "Authority Dashboard" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPage(key)}
            className="nav-btn"
            style={{
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: page === key ? 600 : 400,
              background: page === key ? "rgba(14,165,233,0.13)" : "transparent",
              border: page === key ? `1px solid ${G.borderHi}` : "1px solid transparent",
              borderRadius: 8,
              cursor: "pointer",
              color: page === key ? G.tealGlow : G.textSub,
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </button>
        ))}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11.5, color: G.green, fontWeight: 500 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: G.green,
              animation: "pulse 2.5s infinite",
              display: "inline-block",
            }} />
            Live · Sepolia
          </span>
        </div>
      </nav>

      {page === "report" ? <ReportPage /> : <DashboardPage />}
    </div>
  );
}
