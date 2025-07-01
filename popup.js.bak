document.addEventListener("DOMContentLoaded", function() {
  const connectButton = document.getElementById("connect-button");
  const sendButton = document.getElementById("send-button");
  const userInput = document.getElementById("user-input");
  const chatMessages = document.getElementById("chat-messages");

  connectButton.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "start_oauth" }, (response) => {
      if (response && response.status === "success") {
        document.getElementById("connect-area").style.display = "none";
        document.getElementById("chat-area").style.display = "block";
        appendMessage("bot", "Connected! How can I help you with Gmail?");
      } else {
        alert("Error connecting to Gmail: " + (response.message || "Unknown error"));
      }
    });
  });

  function appendMessage(sender, text) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", `${sender}-message`);
    const p = document.createElement("p");
    p.textContent = text;
    messageDiv.appendChild(p);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function handleUserInput() {
    const message = userInput.value.trim();
    if (message === "") return;
    appendMessage("user", message);
    userInput.value = "";

    const { userId } = await chrome.storage.local.get("userId");
    if (!userId) {
      appendMessage("bot", "Please connect your Gmail first.");
      return;
    }

    try {
      const response = await fetch("https://bhargavibhatt.app.n8n.cloud/webhook-test/oauth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, query: message })
      });

      const data = await response.json();
      if (data && data.reply) {
        appendMessage("bot", data.reply);
      } else {
        appendMessage("bot", "No reply received.");
      }
    } catch (error) {
      console.error(error);
      appendMessage("bot", "Error communicating with server.");
    }
  }

  sendButton.addEventListener("click", handleUserInput);
  userInput.addEventListener("keypress", function(e) {
    if (e.key === "Enter") handleUserInput();
  });
});