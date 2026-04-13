# POCSO Shield — Browser Extension

Warns and blocks access to domains flagged under the POCSO Act (Protection of Children from Sexual Offences Act, 2012).

## How it works

1. On install, the extension fetches a **hashed domain blocklist** from the POCSO Shield backend (`GET /blocklist`).
2. The blocklist contains **SHA-256 hashes** of flagged domains — not the raw domain names — preserving privacy.
3. On every navigation, the extension hashes the destination domain and checks it against the local list.
4. If matched → the user is redirected to `warning.html` before the harmful page loads.
5. The blocklist refreshes every **30 minutes** automatically.

```
User navigates to URL
        │
        ▼
background.js: hash(domain)
        │
        ▼
hash ∈ blocklistHashes?
   YES → redirect to warning.html
   NO  → allow navigation
```

## Architecture

| File            | Role                                                            |
|------------------|-----------------------------------------------------------------|
| `manifest.json`  | Manifest v3 — Chrome + Firefox compatible                      |
| `background.js`  | Service worker: blocklist fetch, navigation interception       |
| `content.js`     | Fallback content-script check (document_start)                 |
| `warning.html`   | Full-page warning shown when a blocked domain is accessed      |
| `popup.html`     | Extension toolbar popup: stats + manual URL checker            |

## Installing (Chrome / Edge)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this `extension/` folder
5. The POCSO Shield icon appears in the toolbar

## Installing (Firefox)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `extension/manifest.json`

## Configuration

Change `BACKEND_URL` in `background.js` before deploying:

```js
const BACKEND_URL = "https://your-production-server.com";
```

## Blocklist endpoint

The extension fetches `GET /blocklist` from the backend, which returns:

```json
{
  "root": "0x...",           // Merkle root (matches smart contract)
  "updatedAt": 1712345678000,
  "count": 42,
  "hashes": ["a3f1e2b4...", ...],   // SHA-256(domain).slice(0,16) — no raw domains
}
```

## ISP / DNS integration (conceptual)

For ISP-level blocking, the Merkle root from the smart contract (`ReportRegistry.blocklistMerkleRoot`) can be:
- Published to a **DNS RPZ (Response Policy Zone)** feed consumed by ISP resolvers
- Pushed to **CERT-In / DoT** via the National Cyber Crime Reporting Portal API
- Integrated into **SafeDNS / BSNL parental controls** using the hashed domain list

The browser extension serves as the last line of defence for ISPs not yet integrated.
