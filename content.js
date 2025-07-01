// content.js
console.log("content.js loaded inside Gmail tab");

// (optional future)
// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentThreadId") {
    // example logic to scrape Gmail DOM
    const threadIdMatch = window.location.href.match(/th=([a-zA-Z0-9]+)/);
    if (threadIdMatch) {
      sendResponse({ threadId: threadIdMatch[1] });
    } else {
      sendResponse({ threadId: null });
    }
    return true; // async
  }
});
