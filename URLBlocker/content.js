(function() {
  let warningOverlay = null;
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SHOW_WARNING') {
      showWarningOverlay(message.blockedUrl);
    }
  });
  
  function showWarningOverlay(blockedUrl) {
    if (warningOverlay) {
      return; // Warning already shown
    }
    
    // Create warning overlay
    warningOverlay = document.createElement('div');
    warningOverlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: white;
          padding: 30px;
          border-radius: 10px;
          text-align: center;
          max-width: 500px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">
          <h2 style="color: #e74c3c; margin-top: 0;">⚠️ Site Blocked</h2>
          <p style="margin: 15px 0; color: #333;">
            This website has been blocked to help you stay focused.
          </p>
          <p style="font-size: 14px; color: #666; margin-bottom: 20px;">
            Blocked URL: ${new URL(blockedUrl).hostname}
          </p>
          <div style="display: flex; gap: 10px; justify-content: center;">
            <button id="proceedBtn" style="
              background: #e74c3c;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
            ">Proceed Anyway</button>
            <button id="goBackBtn" style="
              background: #3498db;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
            ">Go Back</button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(warningOverlay);
    
    // Add event listeners
    warningOverlay.querySelector('#proceedBtn').addEventListener('click', () => {
      removeWarningOverlay();
    });
    
    warningOverlay.querySelector('#goBackBtn').addEventListener('click', () => {
      window.history.back();
    });
  }
  
  function removeWarningOverlay() {
    if (warningOverlay) {
      warningOverlay.remove();
      warningOverlay = null;
    }
  }
})();