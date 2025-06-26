// --- Configuration Constants ---
const N8N_CATEGORIZATION_WEBHOOK_URL = "https://webhook-test.com/98536bc0a0f91d13fe6a569125559156"; // Example: "https://your.n8n.instance.com/webhook/categorize"
const GMAIL_API_BASE_URL = "https://www.googleapis.com/gmail/v1/users/me/messages";

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
      throw new Error(`N8n API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error calling N8n workflow:', error);
    throw error; // Re-throw to be caught by the caller
  }
}

// --- Helper function for making Google API calls (Gmail API) ---
async function callGoogleApi(endpoint, method = 'GET', body = null) {
  try {
    const token = await new Promise(resolve => {
      chrome.identity.getAuthToken({ interactive: true }, token => {
        if (chrome.runtime.lastError) {
          console.error("Google Auth Error:", chrome.runtime.lastError.message);
          // Handle error: e.g., user denied access, or a problem with client ID
          resolve(null);
        } else {
          resolve(token);
        }
      });
    });

    if (!token) {
      throw new Error("User did not grant authentication or token acquisition failed.");
    }

    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${GMAIL_API_BASE_URL}${endpoint}`, options);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gmail API Error: ${response.status} - ${errorText}`);
      throw new Error(`Gmail API Error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error calling Google API:`, error);
    throw error;
  }
}

// --- Helper to extract email metadata, full body, and snippet from Gmail API response ---
// This function processes a SINGLE message's 'payload' object, which is fetched with format=full
function extractEmailDetails(messagePayload) { // Expects messagePayload, which is messageDetails.payload
    if (!messagePayload) {
        console.warn("Received undefined messagePayload for email details extraction. Returning empty object.");
        return {};
    }

    // Ensure headers exist before reducing
    const headers = (messagePayload.headers && Array.isArray(messagePayload.headers)) ?
                     messagePayload.headers.reduce((acc, header) => {
                       acc[header.name] = header.value;
                       return acc;
                     }, {}) : {};

    let fullBody = ''; // New variable to store the full email body
    let snippet = '';

    // Function to decode Base64 URL-safe data
    const decodeBase64Url = (data) => atob(data.replace(/-/g, '+').replace(/_/g, '/'));

    // Prioritize plain text part for full body and snippet
    if (messagePayload.parts && Array.isArray(messagePayload.parts) && messagePayload.parts.length > 0) {
        const plainTextPart = messagePayload.parts.find(part => part.mimeType === 'text/plain');
        if (plainTextPart && plainTextPart.body && plainTextPart.body.data) {
            fullBody = decodeBase64Url(plainTextPart.body.data);
            snippet = fullBody.substring(0, 200).split('\n')[0]; // Take first line up to 200 chars
        }
    } else if (messagePayload.body && messagePayload.body.data) {
        // Fallback for simple message structure (non-multipart)
        fullBody = decodeBase64Url(messagePayload.body.data);
        snippet = fullBody.substring(0, 200).split('\n')[0];
    }

    // Determine read/unread status
    const isRead = !(messagePayload.labelIds && messagePayload.labelIds.includes('UNREAD'));

    // Determine if it has attachments
    const hasAttachments = messagePayload.parts ? messagePayload.parts.some(part => part.filename && part.filename.length > 0) : false;

    // Parse sender and recipient info
    const senderHeader = headers.From || '';
    let senderName = '';
    let senderEmail = '';
    const senderMatch = senderHeader.match(/(.*)<(.*)>/);
    if (senderMatch) {
      senderName = senderMatch[1].trim().replace(/"/g, '');
      senderEmail = senderMatch[2].trim();
    } else {
      senderEmail = senderHeader.trim();
      senderName = senderEmail; // Fallback
    }

    const toRecipients = [];
    if (headers.To) {
        headers.To.split(',').forEach(r => {
            const match = r.match(/(.*)<(.*)>/);
            if (match) toRecipients.push({ name: match[1].trim().replace(/"/g, ''), email: match[2].trim() });
            else toRecipients.push({ name: r.trim(), email: r.trim() });
        });
    }

    const ccRecipients = [];
    if (headers.Cc) {
        headers.Cc.split(',').forEach(r => {
            const match = r.match(/(.*)<(.*)>/);
            if (match) ccRecipients.push({ name: match[1].trim().replace(/"/g, ''), email: match[2].trim() });
            else ccRecipients.push({ name: r.trim(), email: r.trim() });
        });
    }

    return {
      id: messagePayload.id,
      subject: headers.Subject || 'No Subject',
      sender: { name: senderName, email: senderEmail },
      recipients: { to: toRecipients, cc: ccRecipients },
      datetime: headers.Date ? new Date(headers.Date).toISOString() : null, // ISO 8601
      fullBody: fullBody, // Now includes the full body
      snippet: snippet,
      isRead: isRead,
      hasAttachments: hasAttachments,
      labels: messagePayload.labelIds || [],
      threadId: messagePayload.threadId
    };
}


// --- Message Listener from popup.js ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "categorize_emails") {
    (async () => {
      const startDate = request.startDate;
      const endDate = request.endDate;

      // Format dates for Gmail API query (e.g., "after:2025/06/16 before:2025/06/19")
      // Adjust endDate to include the whole day (add 1 day to it for 'before')
      const queryEndDate = new Date(endDate);
      queryEndDate.setDate(queryEndDate.getDate() + 1);
      const formattedQueryEndDate = queryEndDate.toISOString().slice(0, 10).replace(/-/g, '/');
      const formattedQueryStartDate = new Date(startDate).toISOString().slice(0, 10).replace(/-/g, '/');

      const gmailQuery = `after:${formattedQueryStartDate} before:${formattedQueryEndDate}`;
      console.log("Gmail API Query:", gmailQuery);

      let allFetchedEmails = [];
      let nextPageToken = null;
      const MAX_EMAILS_TO_FETCH = 500; // Safety limit for MVP to prevent too much data

      try {
        // Loop to handle pagination (if more than 100 messages)
        do {
          const listEndpoint = `?q=${encodeURIComponent(gmailQuery)}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}&maxResults=100`;
          const listResponse = await callGoogleApi(listEndpoint);

          // Check if listResponse or listResponse.messages is undefined/null before iterating
          if (listResponse && listResponse.messages && Array.isArray(listResponse.messages)) {
            for (const messageRef of listResponse.messages) {
              // Fetch full message details including payload for body/headers
              const messageDetails = await callGoogleApi(`/${messageRef.id}?format=full`); // Use format=full to get body content for snippet
              if (messageDetails && messageDetails.payload) {
                // Pass messageDetails.payload to extractEmailDetails
                allFetchedEmails.push(extractEmailDetails(messageDetails.payload));
              }
              if (allFetchedEmails.length >= MAX_EMAILS_TO_FETCH) {
                  console.warn(`Reached max emails to fetch (${MAX_EMAILS_TO_FETCH}). Stopping pagination.`);
                  break;
              }
            }
            nextPageToken = listResponse.nextPageToken;
          } else {
            // No messages in this response or response.messages is not an array
            console.log("No more messages or an unexpected response structure from Gmail API list endpoint.", listResponse);
            nextPageToken = null;
          }
        } while (nextPageToken && allFetchedEmails.length < MAX_EMAILS_TO_FETCH);

        console.log(`Fetched ${allFetchedEmails.length} emails. Sending to N8n for categorization.`);

        // Send fetched email data to N8n for categorization
        const n8nResponse = await callN8nWorkflow(N8N_CATEGORIZATION_WEBHOOK_URL, { emails: allFetchedEmails });

        // Access n8nResponse[0].categorizedEmails because N8n's "Respond to Webhook"
        // wraps the single item in an array when "All Incoming Items" is selected.
        if (n8nResponse && Array.isArray(n8nResponse) && n8nResponse.length > 0 && n8nResponse[0].categorizedEmails) {
          sendResponse({ categorizedEmails: n8nResponse[0].categorizedEmails });
        } else {
          console.error("N8n response structure unexpected:", n8nResponse);
          sendResponse({ error: "N8n did not return categorized emails in the expected format." });
        }

      } catch (error) {
        console.error("Error during email categorization process:", error);
        sendResponse({ error: error.message || "Failed to categorize emails." });
      }
    })();
    return true; // Indicates an asynchronous response
  }
});