// moderator.js — AI-assisted Content Verification & Moderation
// Handles: report filtering/prioritization, repeated offender detection, flagging

const crypto = require("crypto");

// ─── In-memory offender registry (replace with DB in production) ──────────────
// Key: normalized domain/URL hash  →  { count, firstSeen, lastSeen, reportIds[] }
const offenderRegistry = new Map();

// ─── Severity weights for AI prioritization ──────────────────────────────────
const PRIORITY_WEIGHTS = {
  CRITICAL:   100,
  HIGH:        70,
  SUSPICIOUS:  35,
  LOW:         10,
};

// ─── Content patterns that trigger automatic moderation flags ─────────────────
const MODERATION_RULES = [
  {
    id:      "REPEAT_OFFENDER",
    label:   "Repeat Offender Domain",
    test:    (url, _desc, ctx) => ctx.domainReportCount >= 3,
    severity: "HIGH",
  },
  {
    id:      "MULTI_REPORT_SPIKE",
    label:   "Spike: 5+ reports in 24 h",
    test:    (_url, _desc, ctx) => ctx.recentReportCount >= 5,
    severity: "HIGH",
  },
  {
    id:      "EXPLICIT_KEYWORDS",
    label:   "Explicit harmful content keywords",
    test:    (_url, desc) =>
      /\b(csam|child porn|underage nude|minor sex)\b/i.test(desc),
    severity: "CRITICAL",
  },
  {
    id:      "DARK_WEB_INDICATORS",
    label:   "Dark-web / onion indicators",
    test:    (url) => /\.onion|tor2web|i2p\.to/i.test(url),
    severity: "HIGH",
  },
  {
    id:      "FILE_SHARING_ABUSE",
    label:   "Suspicious file-share host",
    test:    (url) =>
      /mega\.nz|gofile\.io|anonfiles|bayfiles|sendspace/i.test(url),
    severity: "MEDIUM",
  },
  {
    id:      "ENCODED_URL",
    label:   "Obfuscated / encoded URL",
    test:    (url) => (url.match(/%[0-9a-f]{2}/gi) || []).length > 6,
    severity: "MEDIUM",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeDomain(url) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.slice(0, 64).toLowerCase();
  }
}

function domainHash(domain) {
  return crypto.createHash("sha256").update(domain).digest("hex").slice(0, 16);
}

function getRecentCount(registry, windowMs = 24 * 60 * 60 * 1000) {
  const cutoff = Date.now() - windowMs;
  let count = 0;
  for (const entry of registry.values()) {
    if (entry.lastSeen > cutoff) count++;
  }
  return count;
}

// ─── Core moderation function ─────────────────────────────────────────────────

/**
 * analyzeReport(url, description, aiScore, reportId)
 * Returns:
 *   { priority, flags[], offenderInfo, moderationLabel, autoEscalate }
 */
function analyzeReport(url, description, aiScore, reportId) {
  const domain    = normalizeDomain(url);
  const dHash     = domainHash(domain);
  const now       = Date.now();

  // ── Update offender registry ──────────────────────────────────────────────
  const existing = offenderRegistry.get(dHash) || {
    domain,
    count:     0,
    firstSeen: now,
    lastSeen:  now,
    reportIds: [],
    scores:    [],
  };

  existing.count++;
  existing.lastSeen = now;
  existing.reportIds.push(reportId);
  existing.scores.push(aiScore);
  offenderRegistry.set(dHash, existing);

  // ── Build context for rule tests ──────────────────────────────────────────
  const ctx = {
    domainReportCount:  existing.count,
    recentReportCount:  getRecentCount(offenderRegistry),
    averageScore:       existing.scores.reduce((a, b) => a + b, 0) / existing.scores.length,
  };

  // ── Apply moderation rules ────────────────────────────────────────────────
  const flags = MODERATION_RULES
    .filter((rule) => rule.test(url, description, ctx))
    .map((rule) => ({
      id:       rule.id,
      label:    rule.label,
      severity: rule.severity,
    }));

  // ── Compute priority score ────────────────────────────────────────────────
  const baseCategory =
    aiScore >= 85 ? "CRITICAL" :
    aiScore >= 60 ? "HIGH"     :
    aiScore >= 35 ? "SUSPICIOUS" : "LOW";

  let priority = PRIORITY_WEIGHTS[baseCategory];

  // Boost priority for each flag
  flags.forEach((f) => {
    if (f.severity === "CRITICAL") priority += 30;
    else if (f.severity === "HIGH") priority += 15;
    else if (f.severity === "MEDIUM") priority += 8;
  });

  // Boost for repeat offender
  if (existing.count > 1) priority += Math.min(existing.count * 5, 25);

  priority = Math.min(priority, 100);

  // ── Auto-escalate decision ────────────────────────────────────────────────
  const autoEscalate =
    aiScore >= 85 ||
    flags.some((f) => f.severity === "CRITICAL") ||
    existing.count >= 3;

  // ── Moderation label ──────────────────────────────────────────────────────
  const moderationLabel =
    priority >= 85 ? "CRITICAL — Immediate Action"  :
    priority >= 65 ? "HIGH — Priority Review"        :
    priority >= 40 ? "MEDIUM — Standard Queue"       :
                     "LOW — Routine Check";

  return {
    priority,
    moderationLabel,
    flags,
    autoEscalate,
    offenderInfo: {
      domain,
      reportCount:  existing.count,
      firstSeen:    existing.firstSeen,
      lastSeen:     existing.lastSeen,
      averageScore: Math.round(ctx.averageScore),
      isRepeatOffender: existing.count >= 3,
    },
  };
}

/**
 * getOffenderStats()
 * Returns top offenders for dashboard display
 */
function getOffenderStats() {
  const entries = Array.from(offenderRegistry.values());
  return entries
    .filter((e) => e.count >= 2)
    .sort((a, b) => b.count - a.count || b.averageScore - a.averageScore)
    .slice(0, 20)
    .map((e) => ({
      domain:           e.domain,
      reportCount:      e.count,
      averageScore:     Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length),
      firstSeen:        e.firstSeen,
      lastSeen:         e.lastSeen,
      isRepeatOffender: e.count >= 3,
    }));
}

/**
 * prioritizeReports(reports)
 * Sorts a list of reports by moderation priority (highest first)
 * Used when reports don't have live moderation data yet
 */
function prioritizeReports(reports) {
  return [...reports].sort((a, b) => {
    const scoreA = PRIORITY_WEIGHTS[
      a.riskScore >= 85 ? "CRITICAL" :
      a.riskScore >= 60 ? "HIGH"     :
      a.riskScore >= 35 ? "SUSPICIOUS" : "LOW"
    ];
    const scoreB = PRIORITY_WEIGHTS[
      b.riskScore >= 85 ? "CRITICAL" :
      b.riskScore >= 60 ? "HIGH"     :
      b.riskScore >= 35 ? "SUSPICIOUS" : "LOW"
    ];
    return scoreB - scoreA;
  });
}

module.exports = { analyzeReport, getOffenderStats, prioritizeReports };
