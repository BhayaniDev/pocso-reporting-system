// threatDetector.js — Automated Threat Detection (Advanced)
// Handles: harmful domain/pattern detection, suspicious access alerts

const crypto = require("crypto");

// ─── Known harmful domain blocklist (hashed SHA-256 for privacy) ──────────────
// In production: sync from NCMEC, IWF, or Interpol feeds
// Format: sha256(normalized_domain).slice(0,16)  →  label
const KNOWN_HARMFUL_HASHES = new Set([
  // Placeholder hashes representing known CSAM/abuse infrastructure
  // Real deployment: load from a maintained threat-intel feed
  "a3f1e2b4c5d6e7f8", // example-harmful-domain-1.tld
  "b4c5d6e7f8a1b2c3", // example-harmful-domain-2.tld
]);

// ─── Harmful URL pattern signatures ──────────────────────────────────────────
const HARMFUL_PATTERNS = [
  // Known CSAM distribution path patterns
  { regex: /\/(cp|csam|kiddie|loli|pedo|underage)[_\-/]/i,   label: "CSAM path pattern",          severity: "CRITICAL" },
  { regex: /\?.*\b(age=\d{1,2}|y\.o\.|yr\.old)\b/i,         label: "Age-targeting query param",   severity: "HIGH"     },
  { regex: /\/hidden[-_]cam|\/spy[-_]cam|\/upskirt/i,         label: "Covert recording pattern",    severity: "HIGH"     },
  { regex: /\/live[-_]?stream.*child|\/cam.*minor/i,          label: "Live abuse stream indicator", severity: "CRITICAL" },
  // File extensions associated with bulk distribution
  { regex: /\.(7z|rar|zip)\?pw=|password.*(zip|rar|7z)/i,    label: "Password-protected archive",  severity: "MEDIUM"   },
  // Obfuscation / evasion techniques
  { regex: /[a-z0-9]{30,}\.(php|aspx)\?/i,                   label: "Randomised PHP/ASPX script",  severity: "MEDIUM"   },
  { regex: /bit\.ly|tinyurl|t\.co\/[a-z0-9]{6,}/i,           label: "Shortened/redirect URL",      severity: "LOW"      },
  // Darknet bridges
  { regex: /\.onion|tor2web\.(org|io|fi)|onion\.ly/i,         label: "Tor / dark-web endpoint",     severity: "HIGH"     },
];

// ─── Suspicious access heuristics ────────────────────────────────────────────
// Tracks: rapid report bursts, odd-hours spikes, payload anomalies
const accessLog = [];   // { timestamp, ip, endpoint, userAgent }
const ALERT_WINDOW_MS = 60 * 1000;    // 1-minute rolling window
const BURST_THRESHOLD = 10;           // >10 requests/min from same IP = suspicious

const suspiciousAlerts = [];          // persisted alert list for dashboard

function logAccess({ ip, endpoint, userAgent }) {
  const now = Date.now();
  accessLog.push({ timestamp: now, ip, endpoint, userAgent });

  // Prune entries older than 10 minutes to keep memory bounded
  const cutoff = now - 10 * 60 * 1000;
  while (accessLog.length && accessLog[0].timestamp < cutoff) {
    accessLog.shift();
  }

  // ── Check burst threshold ─────────────────────────────────────────────────
  const windowStart = now - ALERT_WINDOW_MS;
  const recentFromIP = accessLog.filter(
    (e) => e.ip === ip && e.timestamp >= windowStart
  );

  if (recentFromIP.length >= BURST_THRESHOLD) {
    const alertId = crypto
      .createHash("sha256")
      .update(`${ip}-burst-${Math.floor(now / 60000)}`)
      .digest("hex")
      .slice(0, 12);

    const alreadyFired = suspiciousAlerts.some((a) => a.id === alertId);
    if (!alreadyFired) {
      const alert = {
        id:        alertId,
        type:      "BURST_ACCESS",
        label:     "Rapid-fire request burst detected",
        detail:    `${recentFromIP.length} requests in 60 s from ${anonymizeIP(ip)}`,
        severity:  "HIGH",
        timestamp: now,
        resolved:  false,
      };
      suspiciousAlerts.unshift(alert);
      console.warn("[THREAT] Burst access alert:", alert.detail);
      trimAlerts();
    }
  }

  // ── Off-hours spike (between 01:00 – 04:00 local server time) ────────────
  const hour = new Date(now).getHours();
  if (hour >= 1 && hour <= 4) {
    const recentAll = accessLog.filter(
      (e) => e.timestamp >= windowStart && e.endpoint === "/report"
    );
    if (recentAll.length >= 5) {
      const alertId = `night-spike-${Math.floor(now / 300000)}`; // 5-min bucket
      if (!suspiciousAlerts.some((a) => a.id === alertId)) {
        suspiciousAlerts.unshift({
          id:        alertId,
          type:      "OFF_HOURS_SPIKE",
          label:     "Unusual off-hours submission spike",
          detail:    `${recentAll.length} reports filed between 01:00–04:00`,
          severity:  "MEDIUM",
          timestamp: now,
          resolved:  false,
        });
        trimAlerts();
      }
    }
  }
}

// ─── Main threat-scan function ────────────────────────────────────────────────

/**
 * scanForThreats(url, description)
 * Returns:
 *   { threatLevel, threats[], knownHarmfulDomain, requiresImmediateAlert }
 */
function scanForThreats(url, description) {
  const combined = (url + " " + description).toLowerCase();
  const threats  = [];

  // 1. Check against known harmful domain hash list
  let knownHarmfulDomain = false;
  try {
    const domain = new URL(url.startsWith("http") ? url : `https://${url}`)
      .hostname.replace(/^www\./, "")
      .toLowerCase();
    const hash = crypto
      .createHash("sha256")
      .update(domain)
      .digest("hex")
      .slice(0, 16);

    if (KNOWN_HARMFUL_HASHES.has(hash)) {
      knownHarmfulDomain = true;
      threats.push({
        id:       "KNOWN_DOMAIN",
        label:    "Known harmful domain (blocklist match)",
        severity: "CRITICAL",
        source:   "threat-intel-blocklist",
      });
    }
  } catch {
    // malformed URL — handled elsewhere
  }

  // 2. Scan URL + description against harmful patterns
  for (const pattern of HARMFUL_PATTERNS) {
    if (pattern.regex.test(url) || pattern.regex.test(description)) {
      threats.push({
        id:       `PATTERN_${pattern.label.replace(/\W+/g, "_").toUpperCase()}`,
        label:    pattern.label,
        severity: pattern.severity,
        source:   "pattern-match",
      });
    }
  }

  // 3. Determine aggregate threat level
  const hasCritical = threats.some((t) => t.severity === "CRITICAL");
  const hasHigh     = threats.some((t) => t.severity === "HIGH");
  const threatLevel =
    hasCritical ? "CRITICAL" :
    hasHigh     ? "HIGH"     :
    threats.length > 0 ? "MEDIUM" : "NONE";

  // 4. Push an immediate alert for CRITICAL detections
  if (hasCritical || knownHarmfulDomain) {
    const alertId = crypto
      .createHash("sha256")
      .update(url + Date.now().toString().slice(0, -4))
      .digest("hex")
      .slice(0, 12);

    if (!suspiciousAlerts.some((a) => a.id === alertId)) {
      suspiciousAlerts.unshift({
        id:        alertId,
        type:      "CRITICAL_CONTENT",
        label:     knownHarmfulDomain
          ? "Known harmful domain submitted"
          : "Critical threat pattern detected in report",
        detail:    threats.map((t) => t.label).join("; "),
        severity:  "CRITICAL",
        timestamp: Date.now(),
        resolved:  false,
      });
      trimAlerts();
    }
  }

  return {
    threatLevel,
    threats,
    knownHarmfulDomain,
    requiresImmediateAlert: hasCritical || knownHarmfulDomain,
  };
}

// ─── Alert management ─────────────────────────────────────────────────────────

function getSuspiciousAlerts(limit = 50) {
  return suspiciousAlerts.slice(0, limit);
}

function resolveAlert(alertId) {
  const alert = suspiciousAlerts.find((a) => a.id === alertId);
  if (alert) {
    alert.resolved    = true;
    alert.resolvedAt  = Date.now();
    return true;
  }
  return false;
}

function trimAlerts(max = 200) {
  if (suspiciousAlerts.length > max) {
    suspiciousAlerts.length = max;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function anonymizeIP(ip) {
  if (!ip) return "unknown";
  const parts = ip.split(".");
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.*.*`;
  return ip.replace(/:[^:]+$/, ":****"); // IPv6 last segment
}

module.exports = {
  scanForThreats,
  logAccess,
  getSuspiciousAlerts,
  resolveAlert,
};
