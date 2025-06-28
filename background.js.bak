// --- Configuration Constants ---
// REPLACE THIS WITH YOUR ACTUAL N8N WEBHOOK URL FOR THE CHATBOT
const N8N_CHATBOT_WEBHOOK_URL = "https://saaidev99.app.n8n.cloud/webhook-test/sa_ai_extension_dev";
const GMAIL_API_BASE_URL = "https://www.googleapis.com/gmail/v1/users/me/messages"; // Not used directly by extension in this MVP, but good for context

// --- Helper function for making API calls to N8n ---
async function callN8nWorkflow(url, payload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`N8n API Error: ${response.status} - ${errorText}`);
      throw new Error(`N8n API Error: ${response.status} - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error calling N8n workflow:', error);
    throw error;
  }
}

// --- Listener for messages from popup.js or content.js ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "process_chatbot_query") {
    (async () => {
      try {
        // 1. Get Gmail OAuth Token
        const token = await new Promise(resolve => {
          chrome.identity.getAuthToken({ interactive: true }, token => {
            if (chrome.runtime.lastError) {
              console.error("Google Auth Error:", chrome.runtime.lastError.message);
              resolve(null);
            } else {
              resolve(token);
            }
          });
        });

        if (!token) {
          sendResponse({ status: 'error', message: "Authentication failed. Please grant Gmail access." });
          return;
        }

        // 2. Potentially get thread ID if user is in a Gmail thread
        let threadId = null;
        if (request.tabUrl && request.tabUrl.includes('mail.google.com/mail/u/')) {
            // Attempt to get thread ID from the URL or by sending a message to content.js
            // For now, we'll extract from URL if possible.
            const urlMatch = request.tabUrl.match(/#all\/(thread-[a-f0-9]+)|#inbox\/(thread-[a-f0-9]+)|#starred\/(thread-[a-f0-9]+)/);
            if (urlMatch && urlMatch[1]) {
                threadId = urlMatch[1];
                console.log("Detected Gmail Thread ID from URL:", threadId);
            } else {
                // If not in URL, we might need content.js to extract it from DOM
                // For this MVP, we rely on the URL or omit if not found.
                console.log("No specific Gmail thread ID found in URL. Assuming general inbox query.");
            }
        }


        // 3. Prepare payload for N8n
        const n8nPayload = {
          userQuery: request.query,
          gmailAccessToken: token,
          currentGmailThreadId: threadId, // Pass threadId if available
          // Add any other context needed for your N8n features
        };

        console.log("Sending payload to N8n:", n8nPayload);

        // 4. Send to N8n workflow
        const n8nResponse = await callN8nWorkflow(N8N_CHATBOT_WEBHOOK_URL, n8nPayload);

        // 5. Process N8n response
        // Expecting n8nResponse to have a 'reply' field for the chatbot
        if (n8nResponse && n8nResponse.reply) {
          sendResponse({ status: 'success', reply: n8nResponse.reply });
        } else {
          console.error("N8n response structure unexpected:", n8nResponse);
          sendResponse({ status: 'error', message: "Unexpected response from N8n workflow." });
        }

      } catch (error) {
        console.error("Error in background script:", error);
        sendResponse({ status: 'error', message: error.message || "Failed to process query." });
      }
    })();
    return true; // Indicates an asynchronous response
  }
});

// --- Alarm listener for Follow-Up Reminders ---
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith("follow_up_task_")) {
    const taskId = alarm.name.replace("follow_up_task_", "");
    console.log(`Follow-up reminder triggered for task: ${taskId}`);

    // In a real scenario, you'd fetch task details from Supabase via n8n
    // and then display a richer notification. For MVP, a generic one.
    chrome.notifications.create(alarm.name, {
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: "Sa.AI Follow-Up Reminder",
      message: `Time to follow up on a task! (Task ID: ${taskId})`,
      priority: 2
    });

    // Optionally, send a message to N8n to mark reminder as sent or re-evaluate
    // await callN8nWorkflow("YOUR_N8N_REMINDER_CALLBACK_URL", { taskId: taskId, action: "reminder_sent" });
  }
});