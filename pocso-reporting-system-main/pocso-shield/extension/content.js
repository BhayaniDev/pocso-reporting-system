// content.js — POCSO Shield content script
// Runs at document_start in every page.
// Acts as a secondary check in case the webNavigation API missed a redirect.
// The primary blocking happens in background.js via webNavigation.onBeforeNavigate.

(function () {
  // Only run in top-level frames
  if (window.self !== window.top) return;

  const currentUrl = window.location.href;

  // Skip chrome:// and extension pages
  if (currentUrl.startsWith("chrome") || currentUrl.startsWith("moz-extension")) return;

  // Ask background to check current URL
  chrome.runtime.sendMessage(
    { type: "CHECK_URL", url: currentUrl },
    (resp) => {
      if (chrome.runtime.lastError) return; // extension context invalidated
      if (resp && resp.blocked) {
        // Background should have already redirected, but as a fallback:
        const warningUrl =
          chrome.runtime.getURL("warning.html") +
          "?domain=" + encodeURIComponent(resp.domain) +
          "&hash="   + encodeURIComponent(resp.hash) +
          "&origin=" + encodeURIComponent(currentUrl);

        window.location.replace(warningUrl);
      }
    }
  );
})();
