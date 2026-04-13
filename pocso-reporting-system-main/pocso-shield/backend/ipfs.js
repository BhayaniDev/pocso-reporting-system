// ipfs.js — Pinata IPFS helper
// Pins JSON evidence to IPFS. Returns the CID (e.g. "QmXyz...")

async function pinToIPFS(data) {
  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method:  "POST",
    headers: {
      "Content-Type":        "application/json",
      pinata_api_key:        process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_SECRET,
    },
    body: JSON.stringify({
      pinataContent:  data,
      pinataMetadata: { name: `pocso-report-${Date.now()}` },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Pinata error: ${err}`);
  }

  const json = await response.json();
  return json.IpfsHash; // e.g. "QmXyz..."
}

module.exports = { pinToIPFS };
