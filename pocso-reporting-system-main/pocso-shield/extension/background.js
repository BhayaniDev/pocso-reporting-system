// background.js — POCSO Shield service worker
// Responsibilities:
//   1. Fetch & cache the hashed domain blocklist from the backend
//   2. On every navigation, check the URL's domain hash against the blocklist
//   3. Redirect to warning.html if matched
//   4. Refresh the blocklist every 30 minutes

const BACKEND_URL      = "http://localhost:4000";  // change to prod URL before deploy
const BLOCKLIST_ALARM  = "pocso-refresh-blocklist";
const REFRESH_INTERVAL = 30; // minutes

// ── State (in-memory + chrome.storage.local) ─────────────────────────────────
let blocklistHashes = new Set();
let blocklistRoot   = null;
let lastUpdated     = null;

// ── On install / startup: load cached blocklist immediately ──────────────────
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[POCSO Shield] Extension installed");
  await loadCachedBlocklist();
  await fetchAndCacheBlocklist();
  scheduleRefresh();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadCachedBlocklist();
  await fetchAndCacheBlocklist();
  scheduleRefresh();
});

// ── Alarm: periodic blocklist refresh ────────────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === BLOCKLIST_ALARM) {
    console.log("[POCSO Shield] Refreshing blocklist...");
    await fetchAndCacheBlocklist();
  }
});

function scheduleRefresh() {
  chrome.alarms.create(BLOCKLIST_ALARM, {
    delayInMinutes:  REFRESH_INTERVAL,
    periodInMinutes: REFRESH_INTERVAL,
  });
}

// ── Fetch blocklist from backend ─────────────────────────────────────────────
async function fetchAndCacheBlocklist() {
  try {
    const res  = await fetch(`${BACKEND_URL}/blocklist`, {
      cache: "no-cache",
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    blocklistHashes = new Set(data.hashes || []);
    blocklistRoot   = data.root;
    lastUpdated     = Date.now();

    // Persist to local storage for offline use
    await chrome.storage.local.set({
      blocklistHashes: data.hashes || [],
      blocklistRoot:   data.root,
      blocklistCount:  data.count || 0,
      lastUpdated,
    });

    console.log(`[POCSO Shield] Blocklist updated: ${blocklistHashes.size} domains`);
  } catch (err) {
    console.warn("[POCSO Shield] Failed to fetch blocklist:", err.message);
    // Use cached version if available
    await loadCachedBlocklist();
  }
}

async function loadCachedBlocklist() {
  const stored = await chrome.storage.local.get([
    "blocklistHashes", "blocklistRoot", "lastUpdated"
  ]);
  if (stored.blocklistHashes) {
    blocklistHashes = new Set(stored.blocklistHashes);
    blocklistRoot   = stored.blocklistRoot;
    lastUpdated     = stored.lastUpdated;
    console.log(`[POCSO Shield] Loaded cached blocklist: ${blocklistHashes.size} domains`);
  }
}

// ── URL normalization + hashing ───────────────────────────────────────────────
function normalizeDomain(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

async function domainHashHex(domain) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(domain)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16); // matches backend's slice(0,16)
}

// ── Navigation interception ───────────────────────────────────────────────────
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only check top-level page navigations (frameId 0)
  if (details.frameId !== 0) return;
  if (!details.url || details.url.startsWith("chrome-extension://")) return;

  const domain = normalizeDomain(details.url);
  if (!domain) return;

  const hash = await domainHashHex(domain);

  if (blocklistHashes.has(hash)) {
    console.warn(`[POCSO Shield] BLOCKED: ${domain} (hash: ${hash})`);

    // Redirect to warning page
    const warningUrl =
      chrome.runtime.getURL("warning.html") +
      "?domain=" + encodeURIComponent(domain) +
      "&hash="   + encodeURIComponent(hash) +
      "&origin=" + encodeURIComponent(details.url);

    chrome.tabs.update(details.tabId, { url: warningUrl });
  }
});

// ── Message handler (from popup / content script) ────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_STATUS") {
    sendResponse({
      active:      true,
      count:       blocklistHashes.size,
      root:        blocklistRoot,
      lastUpdated: lastUpdated
        ? new Date(lastUpdated).toLocaleString()
        : "Never",
    });
  }

  if (msg.type === "FORCE_REFRESH") {
    fetchAndCacheBlocklist().then(() => sendResponse({ ok: true }));
    return true; // async
  }

  if (msg.type === "CHECK_URL") {
    (async () => {
      const domain = normalizeDomain(msg.url);
      if (!domain) return sendResponse({ blocked: false });
      const hash    = await domainHashHex(domain);
      sendResponse({ blocked: blocklistHashes.has(hash), domain, hash });
    })();
    return true; // async
  }
});
