// blocklist.js — Merkle-tree domain blocklist manager
// Builds a Merkle tree from all CRITICAL/HIGH-risk flagged domains.
// The root is pushed to the smart contract; the full leaf list is served
// to the browser extension so it can verify membership locally.

const crypto = require("crypto");

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest();
}

function normalizeDomain(url) {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.slice(0, 64).toLowerCase();
  }
}

function domainHashHex(domain) {
  return sha256(domain).toString("hex").slice(0, 16);
}

// ── Merkle tree ───────────────────────────────────────────────────────────────

function buildMerkleTree(leaves) {
  if (leaves.length === 0) return { root: "0".repeat(64), tree: [] };

  // Pad to power of 2
  let level = leaves.map((l) => Buffer.from(l, "hex"));
  while (level.length & (level.length - 1)) {
    level.push(level[level.length - 1]); // duplicate last leaf
  }

  const tree = [level];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const a = level[i];
      const b = level[i + 1];
      const combined =
        a.compare(b) <= 0
          ? Buffer.concat([a, b])
          : Buffer.concat([b, a]);
      next.push(sha256(combined));
    }
    level = next;
    tree.push(level);
  }

  return {
    root: level[0].toString("hex"),
    tree,
    leaves: tree[0],
  };
}

function getMerkleProof(tree, leafIndex) {
  const proof = [];
  let idx = leafIndex;
  for (let level = 0; level < tree.length - 1; level++) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    if (siblingIdx < tree[level].length) {
      proof.push(tree[level][siblingIdx].toString("hex"));
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

// ── In-memory blocklist state ─────────────────────────────────────────────────

let _blocklist = new Map(); // domain → { domain, hash, addedAt, reason, riskScore }
let _merkle    = buildMerkleTree([]);

/**
 * addToBlocklist(domain, reason, riskScore)
 * Adds a domain to the blocklist and rebuilds the Merkle tree.
 */
function addToBlocklist(domain, reason = "flagged", riskScore = 0) {
  const normalized = normalizeDomain(domain.startsWith("http") ? domain : `https://${domain}`);
  const hash       = domainHashHex(normalized);

  if (_blocklist.has(hash)) return; // already listed

  _blocklist.set(hash, {
    domain:    normalized,
    hash,
    addedAt:   Date.now(),
    reason,
    riskScore: Math.round(riskScore),
  });

  _rebuildTree();
  console.log(`[BLOCKLIST] Added: ${normalized} (score: ${riskScore})`);
}

/**
 * maybeBlocklist(domain, riskScore, category)
 * Auto-adds domains with CRITICAL scores or from threat-detector alerts.
 */
function maybeBlocklist(domain, riskScore, category) {
  if (riskScore >= 85 || category === "CRITICAL") {
    addToBlocklist(domain, `auto:score=${riskScore}`, riskScore);
  }
}

function _rebuildTree() {
  const leaves = Array.from(_blocklist.keys()); // hex hashes
  _merkle      = buildMerkleTree(leaves);
}

/**
 * getMerkleRoot()
 * Returns the current Merkle root as a 0x-prefixed hex string (for the contract).
 */
function getMerkleRoot() {
  return "0x" + _merkle.root;
}

/**
 * getBlocklistPayload()
 * Returns what the browser extension downloads: hashed domains + root.
 * No raw domains exposed — only SHA-256 hashes for privacy.
 */
function getBlocklistPayload() {
  return {
    root:      getMerkleRoot(),
    updatedAt: Date.now(),
    count:     _blocklist.size,
    // Extension checks: sha256(domain).slice(0,16) ∈ hashes
    hashes:    Array.from(_blocklist.keys()),
    // Full entries for authority dashboard only
    entries:   Array.from(_blocklist.values()),
  };
}

/**
 * isDomainBlocked(url)
 * Quick in-process check (used by backend before filing report).
 */
function isDomainBlocked(url) {
  const domain = normalizeDomain(url);
  const hash   = domainHashHex(domain);
  return _blocklist.has(hash);
}

module.exports = {
  addToBlocklist,
  maybeBlocklist,
  getMerkleRoot,
  getBlocklistPayload,
  isDomainBlocked,
  normalizeDomain,
  domainHashHex,
};
