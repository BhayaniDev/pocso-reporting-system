require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const multer  = require("multer");

const { scoreReport }                              = require("./scorer");
const { pinToIPFS }                                = require("./ipfs");
const { fileReport, getAllReports, updateStatus }  = require("./contract");
const { analyzeReport, getOffenderStats }          = require("./moderator");
const { scanForThreats, logAccess,
        getSuspiciousAlerts, resolveAlert }         = require("./threatDetector");
const { decryptField, isEncryptedPayload }         = require("./crypto");
const { maybeBlocklist, getBlocklistPayload,
        isDomainBlocked, getMerkleRoot }            = require("./blocklist");

const app    = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());

// ── Access logging middleware ────────────────────────────────────────────────
app.use((req, res, next) => {
  logAccess({
    ip:        req.ip || req.connection?.remoteAddress || "unknown",
    endpoint:  req.path,
    userAgent: req.headers["user-agent"] || "",
  });
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /report  —  accepts both plaintext and AES-256-GCM encrypted payloads
// ─────────────────────────────────────────────────────────────────────────────
app.post("/report", upload.single("file"), async (req, res) => {
  try {
    let url, description;

    // ── Decrypt if client sent encrypted payload ──────────────────────────
    if (isEncryptedPayload(req.body)) {
      console.log("[CRYPTO] Decrypting AES-256-GCM payload...");
      try {
        url         = decryptField(req.body.encUrl,         req.body.keyB64);
        description = decryptField(req.body.encDescription, req.body.keyB64);
        console.log("[CRYPTO] Decryption successful");
      } catch (e) {
        console.error("[CRYPTO] Decryption failed:", e.message);
        return res.status(400).json({ error: "Decryption failed — invalid key or tampered payload" });
      }
    } else {
      // Plaintext fallback (legacy / non-JS clients)
      url         = req.body.url;
      description = req.body.description;
    }

    if (!url || !description) {
      return res.status(400).json({ error: "url and description are required" });
    }

    console.log(`[REPORT] Received report for URL: ${url.slice(0, 60)}`);

    // ── Pre-check: is this domain already blocked? ────────────────────────
    const alreadyBlocked = isDomainBlocked(url);
    if (alreadyBlocked) {
      console.warn("[BLOCKLIST] URL matches existing blocklist entry — auto-CRITICAL");
    }

    // 1. AI Risk scoring
    console.log("[SCORER] Running AI analysis...");
    const aiResult = await scoreReport(url, description);
    console.log(`[SCORER] Score: ${aiResult.score} | Category: ${aiResult.category}`);

    // 2. Threat Detection
    console.log("[THREAT] Running threat scan...");
    const threatResult = scanForThreats(url, description);
    console.log(`[THREAT] Level: ${threatResult.threatLevel} | Threats: ${threatResult.threats.length}`);

    // 3. Content Moderation
    console.log("[MODERATOR] Analysing content and offender history...");
    const tempId    = `temp-${Date.now()}`;
    const modResult = analyzeReport(url, description, aiResult.score, tempId);
    console.log(`[MODERATOR] Priority: ${modResult.priority} | Label: ${modResult.moderationLabel}`);

    // 4. Effective score
    const effectiveScore = Math.min(
      100,
      aiResult.score +
        (threatResult.knownHarmfulDomain ? 30 : 0) +
        (alreadyBlocked ? 20 : 0) +
        (modResult.offenderInfo.isRepeatOffender ? 10 : 0)
    );

    // 5. Auto-add to blocklist if CRITICAL
    maybeBlocklist(url, effectiveScore, aiResult.category);

    // 6. Build IPFS payload — NO identity, NO raw key material
    const ipfsPayload = {
      // NOTE: url and description stored as plaintext in IPFS for evidence purposes.
      // In a higher-security deployment, store only the encrypted blobs here.
      url, description,
      encrypted:        req.body.encrypted === "true",
      aiScore:          aiResult.score,
      effectiveScore,
      aiCategory:       aiResult.category,
      flaggedTerms:     aiResult.flaggedTerms,
      confidence:       aiResult.confidence,
      model:            aiResult.model,
      moderationLabel:  modResult.moderationLabel,
      moderationFlags:  modResult.flags,
      priority:         modResult.priority,
      offenderDomain:   modResult.offenderInfo.domain,
      domainReports:    modResult.offenderInfo.reportCount,
      isRepeatOffender: modResult.offenderInfo.isRepeatOffender,
      threatLevel:      threatResult.threatLevel,
      threats:          threatResult.threats,
      knownHarmfulDomain: threatResult.knownHarmfulDomain || alreadyBlocked,
      blocklistRoot:    getMerkleRoot(),
      reportedAt:       new Date().toISOString(),
    };

    console.log("[IPFS] Pinning evidence to IPFS...");
    const ipfsHash = await pinToIPFS(ipfsPayload);
    console.log(`[IPFS] Pinned: ${ipfsHash}`);

    console.log("[CHAIN] Filing report on Polygon...");
    const txHash = await fileReport(ipfsHash, effectiveScore);
    console.log(`[CHAIN] TX: ${txHash}`);

    res.json({
      success: true, txHash, ipfsHash,
      ipfsUrl: `https://ipfs.io/ipfs/${ipfsHash}`,
      polygonscanUrl: `https://sepolia.etherscan.io/tx/${txHash}`,
      aiResult, moderation: modResult, threat: threatResult,
      effectiveScore, alreadyBlocked,
      message: "Report filed anonymously. Evidence is now immutable on blockchain.",
    });

  } catch (err) {
    console.error("[ERROR]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /reports
// ─────────────────────────────────────────────
app.get("/reports", async (req, res) => {
  try {
    const reports = await getAllReports();
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /status
// ─────────────────────────────────────────────
app.post("/status", async (req, res) => {
  try {
    const { id, statusIndex } = req.body;
    if (!id || statusIndex === undefined) {
      return res.status(400).json({ error: "id and statusIndex are required" });
    }
    const txHash = await updateStatus(id, statusIndex);
    res.json({ success: true, txHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /moderation/offenders
// ─────────────────────────────────────────────
app.get("/moderation/offenders", (_req, res) => {
  res.json({ offenders: getOffenderStats() });
});

// ─────────────────────────────────────────────
// GET /threats/alerts
// ─────────────────────────────────────────────
app.get("/threats/alerts", (req, res) => {
  const limit = parseInt(req.query.limit || "50", 10);
  res.json({ alerts: getSuspiciousAlerts(limit) });
});

// ─────────────────────────────────────────────
// POST /threats/resolve
// ─────────────────────────────────────────────
app.post("/threats/resolve", (req, res) => {
  const { alertId } = req.body;
  if (!alertId) return res.status(400).json({ error: "alertId required" });
  res.json({ success: resolveAlert(alertId), alertId });
});

// ─────────────────────────────────────────────
// GET /blocklist  —  served to browser extension
// Returns hashed domain list + Merkle root (no raw domains)
// ─────────────────────────────────────────────
app.get("/blocklist", (_req, res) => {
  res.json(getBlocklistPayload());
});

// ─────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:   "ok",
    contract: process.env.CONTRACT_ADDRESS || "NOT SET",
    network:  "Polygon Mumbai",
    modules:  ["scorer", "moderator", "threatDetector", "blocklist", "crypto", "ipfs", "contract"],
    blocklistRoot: getMerkleRoot(),
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\nPOCSO Shield backend running on http://localhost:${PORT}`);
  console.log(`Contract: ${process.env.CONTRACT_ADDRESS || "NOT SET — run deploy first"}`);
  console.log("Modules: Scorer | Moderator | ThreatDetector | Blocklist | AES-Crypto | IPFS | Chain\n");
});
