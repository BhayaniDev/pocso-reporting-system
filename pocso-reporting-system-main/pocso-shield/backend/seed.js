// seed.js — run this to pre-populate your dashboard with demo reports
// Usage: node seed.js
// Run AFTER backend is running: npm run dev (in backend folder)

const BACKEND = "http://localhost:4000";

const DEMO_REPORTS = [
  {
    url: "https://suspicious-site-001.example.com/hidden-album",
    description: "Found a hidden album with images of underage children in compromising positions. The site appears to be a private gallery accessible via a direct link shared on a dark forum.",
  },
  {
    url: "https://telegram-redirect.example.com/channel/csam-group",
    description: "This link redirects to a Telegram channel sharing child sexual abuse material. Channel has over 500 members and posts daily.",
  },
  {
    url: "https://video-platform-xyz.example.com/watch?v=ab12cd",
    description: "Uploaded video appears to show grooming behaviour targeting a minor. The uploader has multiple similar videos on the platform.",
  },
  {
    url: "https://forum-darkweb.example.com/thread/123",
    description: "Forum thread sharing links to websites hosting CSAM. Multiple users are trading access credentials in the replies.",
  },
  {
    url: "https://social-media.example.com/profile/suspicious-user",
    description: "This social media profile appears to be an adult posing as a teenager to connect with minors. Profile has suspicious DM patterns.",
  },
  {
    url: "https://file-sharing.example.com/folder/abcdef",
    description: "Shared folder containing what appears to be non-consensual intimate images. The person in the images appears to be a minor.",
  },
];

async function seed() {
  console.log("Seeding demo reports...\n");

  for (let i = 0; i < DEMO_REPORTS.length; i++) {
    const report = DEMO_REPORTS[i];
    try {
      const body = new URLSearchParams({
        url:         report.url,
        description: report.description,
      });

      const res  = await fetch(`${BACKEND}/report`, {
        method:  "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body:    body.toString(),
      });

      const data = await res.json();

      if (data.success) {
        console.log(`[${i + 1}/${DEMO_REPORTS.length}] Filed — Score: ${data.aiResult.score} (${data.aiResult.category})`);
        console.log(`          TX: ${data.txHash}`);
        console.log(`          IPFS: ${data.ipfsHash}\n`);
      } else {
        console.log(`[${i + 1}] FAILED:`, data.error);
      }

      // Wait 3s between submissions to avoid nonce conflicts
      if (i < DEMO_REPORTS.length - 1) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error(`[${i + 1}] Error:`, err.message);
    }
  }

  console.log("\nDone! Open the Authority Dashboard to see all reports.");
}

seed();
