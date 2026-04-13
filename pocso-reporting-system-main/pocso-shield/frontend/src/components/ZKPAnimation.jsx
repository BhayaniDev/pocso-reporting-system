import { useState, useEffect } from "react";

const G = {
  navyCard: "#0f2035",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(14,165,233,0.3)",
  teal:     "#0ea5e9",
  tealGlow: "#38bdf8",
  green:    "#22c55e",
  textPrimary: "#e8f3ff",
  textSub:  "#6a96b8",
  textMuted:"#3d6280",
};

const STEPS = [
  {
    label:  "Generating cryptographic commitment",
    detail: "Hashing identity inputs with Poseidon hash function",
  },
  {
    label:  "Computing witness",
    detail: "Building circuit witness from private inputs (never leaves device)",
  },
  {
    label:  "Generating zk-SNARK proof",
    detail: "Groth16 prover — O(n log n) FFT operations on BN128 curve",
  },
  {
    label:  "Verifying proof locally",
    detail: "Checking pairing equation: e(A,B) = e(α,β)·e(vk,γ)·e(C,δ)",
  },
  {
    label:  "Proof valid — identity stays private",
    detail: "Only public outputs transmitted: claim hash + nullifier",
  },
];

export default function ZKPAnimation({ onComplete }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (current >= STEPS.length) {
      setTimeout(onComplete, 800);
      return;
    }
    const delay = 500 + Math.random() * 400;
    const timer = setTimeout(() => setCurrent((c) => c + 1), delay);
    return () => clearTimeout(timer);
  }, [current, onComplete]);

  const done = current >= STEPS.length;

  return (
    <div style={{ maxWidth: 540, margin: "80px auto", padding: "0 24px", animation: "fadeUp 0.4s ease" }}>
      <div style={{ marginBottom: 30 }}>
        <p style={{ fontSize: 11, color: G.textSub, marginBottom: 6, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Zero-knowledge proof generation
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: G.textPrimary, letterSpacing: "-0.02em", fontFamily: "'Space Grotesk', sans-serif" }}>
          {done ? "Identity verified privately" : "Generating proof..."}
        </h2>
      </div>

      <div style={{ background: G.navyCard, border: `1px solid ${G.border}`, borderRadius: 14, overflow: "hidden" }}>
        {STEPS.map((step, i) => {
          const isComplete = i < current;
          const isActive   = i === current;
          return (
            <div key={i} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              padding: "16px 20px",
              borderBottom: i < STEPS.length - 1 ? `1px solid ${G.border}` : "none",
              opacity:    isComplete ? 1 : isActive ? 0.8 : 0.25,
              transition: "opacity 0.4s ease",
              background: isActive ? "rgba(14,165,233,0.04)" : "transparent",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                border: isComplete ? "none" : `1.5px solid ${isActive ? G.teal : G.border}`,
                background: isComplete ? "#16a34a" : isActive ? "rgba(14,165,233,0.1)" : "transparent",
                flexShrink: 0, marginTop: 1,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
              }}>
                {isComplete && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                {isActive && !done && (
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: G.teal }}/>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: G.textPrimary }}>
                  {step.label}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: 11, color: G.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                  {step.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {done && (
        <div style={{
          marginTop: 18, padding: "16px 20px",
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 12, display: "flex", gap: 12, alignItems: "center",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
              <path d="M4 9l3.5 3.5L14 6" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#4ade80" }}>
              Proof valid — filing to blockchain...
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(74,222,128,0.65)" }}>
              No identity data transmitted. Report is fully anonymous.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
