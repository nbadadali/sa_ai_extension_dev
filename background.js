chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "start_oauth") {
    const clientId = "76996691363-aamae48eidq4ecnpq23sqt11sb18umc0.apps.googleusercontent.com";
    const redirectUri = "https://bhargavibhatt.app.n8n.cloud/webhook-test/oauth/callback";
    const scope = "https://www.googleapis.com/auth/gmail.readonly openid email profile";

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent`;

    chrome.identity.launchWebAuthFlow(
      { url: authUrl, interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError) {
          console.error("OAuth error:", chrome.runtime.lastError);
          sendResponse({ status: "error", message: chrome.runtime.lastError.message });
          return;
        }

        console.log("OAuth redirectUrl:", redirectUrl);

        // Your backend should redirect with ?userId=12345
        const userIdMatch = redirectUrl.match(/userId=([^&]+)/);
        if (userIdMatch && userIdMatch[1]) {
          chrome.storage.local.set({ userId: userIdMatch[1] });
          sendResponse({ status: "success", userId: userIdMatch[1] });
        } else {
          sendResponse({ status: "error", message: "User ID not found in redirect URL." });
        }
      }
    );

    return true; // keep async alive
  }
});