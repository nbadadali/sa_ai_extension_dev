document.addEventListener('DOMContentLoaded', function() {
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const chatMessages = document.getElementById('chat-messages');

  function appendMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${sender}-message`);
    const p = document.createElement('p');
    p.textContent = text;
    messageDiv.appendChild(p);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll to bottom
  }

  async function handleUserInput() {
    const message = userInput.value.trim();
    if (message === '') return;

    appendMessage('user', message);
    userInput.value = ''; // Clear input

    // Show a loading indicator if desired
    // appendMessage('bot', 'Thinking...'); // Or a specific loading spinner

    try {
      // Get current tab info to potentially extract thread ID if in Gmail
      let currentTabId = null;
      let currentTabUrl = null;
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs && tabs.length > 0) {
        currentTabId = tabs[0].id;
        currentTabUrl = tabs[0].url;
      }

      // Send message to background script for processing
      chrome.runtime.sendMessage(
        {
          action: "process_chatbot_query",
          query: message,
          tabId: currentTabId,
          tabUrl: currentTabUrl
        },
        function(response) {
          if (chrome.runtime.lastError) {
            console.error("Error sending message:", chrome.runtime.lastError.message);
            appendMessage('bot', `Error: ${chrome.runtime.lastError.message}. Please try again.`);
            return;
          }

          if (response && response.status === 'success') {
            appendMessage('bot', response.reply);
          } else if (response && response.status === 'error') {
            appendMessage('bot', `Error: ${response.message || 'An unknown error occurred.'}`);
            console.error("Backend error:", response.message);
          } else {
            appendMessage('bot', "No response received from the backend. Check console for details.");
            console.warn("Unexpected response structure:", response);
          }
        }
      );
    } catch (error) {
      console.error("Error in popup.js:", error);
      appendMessage('bot', `An unexpected error occurred: ${error.message}`);
    }
  }

  sendButton.addEventListener('click', handleUserInput);
  userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      handleUserInput();
    }
  });
});