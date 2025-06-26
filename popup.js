document.addEventListener('DOMContentLoaded', function() {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const categorizeButton = document.getElementById('categorizeButton');
  const loadingDiv = document.getElementById('loading');
  const resultsDisplay = document.getElementById('results-display');

  // Set default dates (e.g., last 3 days) for convenience
  const today = new Date();
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(today.getDate() - 3);

  startDateInput.value = threeDaysAgo.toISOString().split('T')[0];
  endDateInput.value = today.toISOString().split('T')[0];

  // Event listener for the Categorize Button
  categorizeButton.addEventListener('click', function() {
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
      alert('Please select both a start and end date.'); // Use a better UI notification in prod
      return;
    }

    loadingDiv.style.display = 'block'; // Show loading indicator
    resultsDisplay.innerHTML = ''; // Clear previous results

    // Send a message to the background script to start categorization
    chrome.runtime.sendMessage({
      action: "categorize_emails",
      startDate: startDate,
      endDate: endDate
    }, function(response) {
      loadingDiv.style.display = 'none'; // Hide loading indicator

      if (chrome.runtime.lastError) {
        resultsDisplay.innerHTML = '<p style="color: red;">Error: ' + chrome.runtime.lastError.message + '</p>';
        console.error(chrome.runtime.lastError.message);
        return;
      }

      if (response && response.categorizedEmails) {
        if (response.categorizedEmails.length === 0) {
          resultsDisplay.innerHTML = '<p>No emails found for the selected date range or no categories determined.</p>';
        } else {
          response.categorizedEmails.forEach(email => {
            const emailItem = document.createElement('div');
            emailItem.className = 'email-item';
            emailItem.innerHTML = `
              <p><strong>Subject:</strong> ${email.subject || 'No Subject'} <span class="category">${email.category || 'Uncategorized'}</span></p>
              <p><strong>From:</strong> ${email.sender.name || email.sender.email} &lt;${email.sender.email}&gt;</p>
              <p><strong>Time:</strong> ${new Date(email.datetime).toLocaleString()}</p>
              <p><strong>Snippet:</strong> ${email.snippet || 'No snippet available.'}</p>
            `;
            resultsDisplay.appendChild(emailItem);
          });
        }
      } else if (response && response.error) {
         resultsDisplay.innerHTML = `<p style="color: red;">An error occurred: ${response.error}. Check console for details.</p>`;
      } else {
         resultsDisplay.innerHTML = '<p style="color: orange;">Could not retrieve email categories. Ensure permissions are granted and N8n is running.</p>';
      }
    });
  });
});
