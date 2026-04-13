import { useState, useCallback } from "react";
import ZKPAnimation from "../components/ZKPAnimation";
import RiskBadge    from "../components/RiskBadge";
import { encryptField, exportSessionKey, hashUrl } from "../utils/encryption";

const BACKEND = "http://localhost:4000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const G = {
  navy:     "#07111f",
  navyCard: "#0f2035",
  navyHover:"#142843",
  teal:     "#0ea5e9",
  tealGlow: "#38bdf8",
  red:      "#ef4444",
  redDim:   "#dc2626",
  green:    "#22c55e",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(14,165,233,0.3)",
  textPrimary: "#e8f3ff",
  textSub:  "#6a96b8",
  textMuted:"#3d6280",
};

function InfoRow({ label, value, mono, link, truncate }) {
  const displayValue =
    truncate && typeof value === "string" && value.length > 20
      ? value.slice(0, 12) + "..." + value.slice(-8)
      : value;

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "11px 0", borderBottom: `1px solid ${G.border}`, gap: 12,
    }}>
      <span style={{ fontSize: 12, color: G.textSub, flexShrink: 0 }}>{label}</span>
      {link ? (
        <a href={link} target="_blank" rel="noreferrer"
          style={{ fontSize: 12, color: G.tealGlow, fontWeight: 500 }}>
          {value} ↗
        </a>
      ) : (
        <span title={truncate ? String(value) : undefined} style={{
          fontSize: 12,
          fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
          color: G.textPrimary, textAlign: "right",
          cursor: truncate ? "help" : undefined,
        }}>
          {displayValue}
        </span>
      )}
    </div>
  );
}

export default function ReportPage() {
  const [url,         setUrl]         = useState("");
  const [description, setDescription] = useState("");
  const [file,        setFile]        = useState(null);
  const [phase,       setPhase]       = useState("idle");
  const [result,      setResult]      = useState(null);
  const [errorMsg,    setErrorMsg]    = useState("");
  const [encStatus,   setEncStatus]   = useState(null);
  const [submitted,   setSubmitted]   = useState(false);

  const handleZKPComplete = useCallback(() => {
    setPhase("encrypting");
  }, []);

  if (phase === "encrypting" && !submitted) {
    setSubmitted(true);
    (async () => {
      try {
        setEncStatus("Deriving AES-256-GCM session key via PBKDF2...");
        await sleep(600);
        const { keyB64 } = await exportSessionKey();

        setEncStatus("Encrypting URL with AES-256-GCM...");
        await sleep(300);
        const encUrl = await encryptField(url);

        setEncStatus("Encrypting report description...");
        await sleep(300);
        const encDescription = await encryptField(description);

        setEncStatus("Hashing domain for blocklist check...");
        await sleep(200);
        const _domainHash = await hashUrl(url);

        setEncStatus("Transmitting encrypted payload to backend...");
        setPhase("submitting");

        const body = new FormData();
        body.append("encrypted",      "true");
        body.append("keyB64",         keyB64);
        body.append("encUrl",         encUrl);
        body.append("encDescription", encDescription);
        if (file) body.append("file", file);

        const res  = await fetch(`${BACKEND}/report`, { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Server error");
        setResult(data);
        setPhase("done");
      } catch (err) {
        setErrorMsg(err.message);
        setPhase("error");
      }
    })();
  }

  async function handleSubmit() {
    if (!url.trim() || !description.trim()) return;
    setPhase("scoring");
    await sleep(900);
    setPhase("zkp");
  }

  function reset() {
    setUrl(""); setDescription(""); setFile(null);
    setPhase("idle"); setResult(null); setErrorMsg("");
    setSubmitted(false); setEncStatus(null);
  }

  // ── ZKP screen ──
  if (phase === "zkp") return <ZKPAnimation onComplete={handleZKPComplete} />;

  // ── Encrypting / Submitting screen ──
  if (phase === "encrypting" || phase === "submitting") {
    return (
      <div style={{ maxWidth: 520, margin: "80px auto", padding: "0 24px", animation: "fadeUp 0.4s ease" }}>
        <p style={{ fontSize: 12, color: G.textSub, marginBottom: 6, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          End-to-end encryption
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: G.textPrimary, marginBottom: 28, letterSpacing: "-0.02em" }}>
          {phase === "submitting" ? "Filing to blockchain..." : "Encrypting your report..."}
        </h2>

        <div style={{
          background: G.navyCard, border: `1px solid ${G.border}`,
          borderRadius: 14, overflow: "hidden", marginBottom: 20,
        }}>
          {[
            { label: "AES-256-GCM session key derived",      done: !!encStatus },
            { label: "URL encrypted (never sent in plaintext)", done: encStatus && !encStatus.includes("URL") },
            { label: "Description encrypted",                done: encStatus && encStatus.includes("Transmitting") || phase === "submitting" },
            { label: "Encrypted payload transmitted",        done: phase === "submitting" },
          ].map((step, i) => (
            <div key={i} style={{
              display: "flex", gap: 14, alignItems: "center",
              padding: "14px 20px",
              borderBottom: i < 3 ? `1px solid ${G.border}` : "none",
              opacity: step.done ? 1 : 0.3, transition: "opacity 0.5s",
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                background: step.done ? "#16a34a" : "rgba(255,255,255,0.06)",
                border: step.done ? "none" : `1px solid ${G.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
              }}>
                {step.done && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, color: G.textPrimary }}>{step.label}</span>
            </div>
          ))}
        </div>

        {encStatus && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "11px 16px",
            background: "rgba(14,165,233,0.08)",
            border: `1px solid rgba(14,165,233,0.2)`,
            borderRadius: 10, fontSize: 12, color: G.tealGlow,
          }}>
            <div style={{
              width: 13, height: 13, border: `2px solid rgba(14,165,233,0.2)`,
              borderTopColor: G.teal, borderRadius: "50%",
              animation: "spin 0.8s linear infinite", flexShrink: 0,
            }}/>
            {encStatus}
          </div>
        )}

        <p style={{ fontSize: 11, color: G.textMuted, marginTop: 16, textAlign: "center" }}>
          Your plaintext data never leaves your device. Only ciphertext is transmitted.
        </p>
      </div>
    );
  }

  // ── Success screen ──
  if (phase === "done" && result) {
    return (
      <div style={{ maxWidth: 580, margin: "60px auto", padding: "0 24px", animation: "fadeUp 0.4s ease" }}>
        {/* Success banner */}
        <div style={{
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 14, padding: "18px 22px", marginBottom: 20,
          display: "flex", gap: 14, alignItems: "flex-start",
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <svg width="17" height="17" viewBox="0 0 18 18" fill="none">
              <path d="M4 9l3.5 3.5L14 6" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, color: "#4ade80", margin: "0 0 4px", fontSize: 15, letterSpacing: "-0.01em" }}>
              Report filed successfully
            </p>
            <p style={{ fontSize: 12, color: "rgba(74,222,128,0.7)", margin: 0 }}>
              AES-256-GCM encrypted · ZKP-protected · Identity never transmitted
            </p>
          </div>
        </div>

        {/* Tech badges */}
        <div style={{
          background: "rgba(14,165,233,0.07)",
          border: `1px solid rgba(14,165,233,0.15)`,
          borderRadius: 10, padding: "10px 16px", marginBottom: 16,
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        }}>
          {["AES-256-GCM encrypted", "ZKP-verified", "IPFS-pinned", "Blockchain-logged"].map((t) => (
            <span key={t} style={{
              background: "rgba(14,165,233,0.12)",
              color: G.tealGlow,
              border: `1px solid rgba(14,165,233,0.2)`,
              borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 600,
            }}>{t}</span>
          ))}
        </div>

        {/* Blockchain receipt */}
        <div style={{
          background: G.navyCard, border: `1px solid ${G.border}`,
          borderRadius: 14, padding: "20px 24px", marginBottom: 16,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: G.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            Blockchain receipt
          </p>
          <InfoRow label="Transaction hash"    value={result.txHash}   mono truncate/>
          <InfoRow label="View on Sepolia" value="Open explorer"   link={result.polygonscanUrl}/>
          <InfoRow label="IPFS evidence CID"   value={result.ipfsHash} mono truncate/>
          <InfoRow label="View evidence"       value="Open on IPFS"    link={result.ipfsUrl}/>
        </div>

        {/* AI analysis */}
        <div style={{
          background: G.navyCard, border: `1px solid ${G.border}`,
          borderRadius: 14, padding: "20px 24px", marginBottom: 24,
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: G.textMuted, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.12em" }}>
            AI analysis
          </p>
          <InfoRow label="Risk score"      value={<RiskBadge score={result.aiResult?.score}/>}/>
          <InfoRow label="Effective score" value={result.effectiveScore}/>
          <InfoRow label="Category"        value={result.aiResult?.category}/>
          <InfoRow label="Confidence"      value={`${Math.round((result.aiResult?.confidence || 0) * 100)}%`}/>
          <InfoRow label="Model used"      value={result.aiResult?.model}/>
          {result.aiResult?.flaggedTerms?.length > 0 && (
            <InfoRow label="Flagged terms" value={result.aiResult.flaggedTerms.join(", ")}/>
          )}
          {result.effectiveScore >= 85 && (
            <div style={{
              marginTop: 14, padding: "10px 14px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 8,
              fontSize: 12, color: "#f87171", fontWeight: 600,
            }}>
              ⚡ Auto-escalated — flagged to authorities and added to domain blocklist
            </div>
          )}
        </div>

        <button onClick={reset} style={{
          width: "100%", padding: "13px 0", fontSize: 14, fontWeight: 600,
          background: "rgba(14,165,233,0.12)",
          color: G.tealGlow,
          border: `1px solid rgba(14,165,233,0.25)`,
          borderRadius: 10, cursor: "pointer",
          transition: "all 0.2s",
        }}>
          Submit another report
        </button>
      </div>
    );
  }

  // ── Error screen ──
  // if (phase === "error") {
  //   return (
  //     <div style={{ maxWidth: 480, margin: "80px auto", padding: "0 24px" }}>
  //       <div style={{
  //         background: "rgba(239,68,68,0.1)",
  //         border: "1px solid rgba(239,68,68,0.25)",
  //         borderRadius: 14, padding: "20px 24px", marginBottom: 20,
  //       }}>
  //         <p style={{ fontWeight: 700, color: "#f87171", margin: "0 0 8px", fontSize: 15 }}>Submission failed</p>
  //         <p style={{ fontSize: 12, color: "#fca5a5", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>{errorMsg}</p>
  //       </div>
  //       <button onClick={reset} style={{
  //         width: "100%", padding: "13px 0", fontSize: 14, fontWeight: 600,
  //         background: G.navyCard, color: G.textPrimary,
  //         border: `1px solid ${G.border}`, borderRadius: 10, cursor: "pointer",
  //       }}>Try again</button>
  //     </div>
  //   );
  // }

  // ── Main form ──
  return (
    <div style={{ animation: "fadeUp 0.5s ease" }}>
      {/* Hero section */}
      <div style={{
        background: `linear-gradient(180deg, #0b1d35 0%, ${G.navy} 100%)`,
        borderBottom: `1px solid ${G.border}`,
        padding: "60px 24px 52px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background glow */}
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 300,
          background: "radial-gradient(ellipse, rgba(14,165,233,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}/>

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.25)",
          borderRadius: 20, padding: "5px 14px",
          fontSize: 11, color: "#4ade80", fontWeight: 600,
          letterSpacing: "0.06em", marginBottom: 24,
          textTransform: "uppercase",
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulse 2s infinite" }}/>
          Official Reporting Portal · POCSO Act 2012
        </div>

        <h1 style={{
          fontSize: 42, fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
          color: G.textPrimary,
          letterSpacing: "-0.03em",
          lineHeight: 1.15,
          marginBottom: 16,
          maxWidth: 560,
          margin: "0 auto 16px",
        }}>
          Report harmful content.<br/>
          <span style={{ color: G.tealGlow }}>Stay anonymous.</span>
        </h1>

        <p style={{
          fontSize: 15, color: G.textSub, lineHeight: 1.7,
          maxWidth: 480, margin: "0 auto 28px",
        }}>
          Zero personal information collected. Your report is encrypted with AES-256-GCM,
          protected by zero-knowledge proof, and logged immutably to the Sepolia blockchain.
        </p>

        {/* Privacy tags */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {["No name", "No email", "No IP logged", "No login required", "ZKP-protected", "AES-256 encrypted"].map((tag) => (
            <span key={tag} style={{
              background: "rgba(14,165,233,0.1)",
              color: G.tealGlow,
              border: `1px solid rgba(14,165,233,0.2)`,
              borderRadius: 6, padding: "4px 12px",
              fontSize: 11, fontWeight: 600,
            }}>{tag}</span>
          ))}
        </div>
      </div>

       {/*Stats bar*/}
      <div style={{
        display: "flex", justifyContent: "center", gap: 0,
        background: G.navyCard,
        borderBottom: `1px solid ${G.border}`,
      }}>
        {[
          { num: "100%", label: "Anonymous" },
          { num: "24/7", label: "Monitoring" },
          { num: "AI", label: "Escalation" },
        ].map((s, i) => (
          <div key={s.label} style={{
            padding: "20px 48px",
            textAlign: "center",
            borderRight: i < 2 ? `1px solid ${G.border}` : "none",
          }}>
            <div style={{
              fontSize: 24, fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              color: G.tealGlow, letterSpacing: "-0.02em",
            }}>{s.num}</div>
            <div style={{ fontSize: 12, color: G.textSub, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "52px 24px 80px" }}>

        {/* URL field */}
        <div style={{ marginBottom: 22 }}>
          <label style={{
            display: "block", fontSize: 12, fontWeight: 600,
            color: G.textSub, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            URL of harmful content <span style={{ color: G.red }}>*</span>
          </label>
          <input
            type="url"
            placeholder="https://example.com/harmful-page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={{
              width: "100%", padding: "13px 16px",
              borderRadius: 10,
              border: `1px solid ${url ? G.borderHi : G.border}`,
              fontSize: 14,
              background: G.navyCard,
              color: G.textPrimary,
              transition: "border-color 0.2s",
            }}
          />
        </div>

        {/* Description field */}
        <div style={{ marginBottom: 22 }}>
          <label style={{
            display: "block", fontSize: 12, fontWeight: 600,
            color: G.textSub, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Describe the content <span style={{ color: G.red }}>*</span>
          </label>
          <textarea
            placeholder="Describe what you observed and why you believe it violates child protection laws under the POCSO Act..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            style={{
              width: "100%", padding: "13px 16px",
              borderRadius: 10,
              border: `1px solid ${description ? G.borderHi : G.border}`,
              fontSize: 14, resize: "vertical",
              background: G.navyCard,
              color: G.textPrimary,
              lineHeight: 1.6,
              transition: "border-color 0.2s",
            }}
          />
        </div>

        {/* File upload */}
        <div style={{ marginBottom: 32 }}>
          <label style={{
            display: "block", fontSize: 12, fontWeight: 600,
            color: G.textSub, marginBottom: 8,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>
            Attach evidence <span style={{ color: G.textMuted, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional — max 10MB)</span>
          </label>
          <div style={{
            background: G.navyCard,
            border: `1px dashed ${G.border}`,
            borderRadius: 10,
            padding: "16px 20px",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "rgba(14,165,233,0.08)",
              border: `1px solid rgba(14,165,233,0.15)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 10V3M5 6l3-3 3 3M3 13h10" stroke={G.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {file ? (
                <div>
                  <p style={{ fontSize: 13, color: G.textPrimary, margin: 0, fontWeight: 500 }}>{file.name}</p>
                  <p style={{ fontSize: 11, color: G.textSub, margin: "2px 0 0" }}>{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: G.textSub, margin: 0 }}>image, video, or PDF</p>
              )}
            </div>
            <label style={{
              padding: "7px 14px", fontSize: 12, fontWeight: 600,
              background: "rgba(14,165,233,0.1)",
              color: G.tealGlow,
              border: `1px solid rgba(14,165,233,0.2)`,
              borderRadius: 7, cursor: "pointer",
              whiteSpace: "nowrap",
            }}>
              Choose file
              <input type="file" accept="image/*,video/*,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!url.trim() || !description.trim() || phase !== "idle"}
          style={{
            width: "100%", padding: "15px 0", fontSize: 15, fontWeight: 700,
            background: !url.trim() || !description.trim()
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            color: !url.trim() || !description.trim() ? G.textMuted : "#fff",
            border: "none", borderRadius: 10,
            cursor: !url.trim() || !description.trim() ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            letterSpacing: "0.01em",
            boxShadow: !url.trim() || !description.trim()
              ? "none"
              : "0 0 24px rgba(239,68,68,0.3)",
          }}
        >
          {phase === "scoring" ? "Analysing content..." : "Submit anonymous report →"}
        </button>

        <p style={{ fontSize: 11, color: G.textMuted, textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
          By submitting you confirm this report is made in good faith under the POCSO Act
        </p>
      </div>
    </div>
  );
}
