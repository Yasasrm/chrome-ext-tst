document.addEventListener('DOMContentLoaded', async function() {
  const currentUrlEl = document.getElementById('currentUrl');
  const currentTitleEl = document.getElementById('currentTitle');
  const currentDomainEl = document.getElementById('currentDomain');
  const urlHistoryEl = document.getElementById('urlHistory');
  const refreshBtn = document.getElementById('refreshBtn');
  const copyUrlBtn = document.getElementById('copyUrlBtn');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  
  let currentTabInfo = null;
  
  // Function to get current tab info
  async function getCurrentTabInfo() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });
      
      if (tab) {
        currentTabInfo = {
          url: tab.url,
          title: tab.title,
          domain: new URL(tab.url).hostname,
          timestamp: new Date().toLocaleString()
        };
        
        return currentTabInfo;
      }
    } catch (error) {
      console.error('Error getting tab info:', error);
      return null;
    }
  }
  
  // Function to update display
  function updateDisplay(tabInfo) {
    if (tabInfo) {
      currentUrlEl.textContent = tabInfo.url;
      currentTitleEl.textContent = tabInfo.title;
      currentDomainEl.textContent = tabInfo.domain;
    }
  }
  
  // Function to add to history
  async function addToHistory(tabInfo) {
    if (!tabInfo) return;
    
    try {
      // Get existing history
      const result = await chrome.storage.local.get(['urlHistory']);
      let history = result.urlHistory || [];
      
      // Add new entry (avoid duplicates)
      const isDuplicate = history.some(item => 
        item.url === tabInfo.url && 
        Math.abs(new Date(item.timestamp) - new Date(tabInfo.timestamp)) < 1000
      );
      
      if (!isDuplicate) {
        history.unshift(tabInfo);
        // Keep only last 50 entries
        history = history.slice(0, 50);
        
        await chrome.storage.local.set({ urlHistory: history });
        displayHistory(history);
      }
    } catch (error) {
      console.error('Error managing history:', error);
    }
  }
  
  // Function to display history
  function displayHistory(history) {
    urlHistoryEl.innerHTML = '';
    
    history.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <strong>${item.domain}</strong><br>
        <span class="url">${item.url}</span><br>
        <small>${item.timestamp}</small>
      `;
      urlHistoryEl.appendChild(historyItem);
    });
  }
  
  // Load and display current tab info
  async function loadCurrentTab() {
    const tabInfo = await getCurrentTabInfo();
    updateDisplay(tabInfo);
    await addToHistory(tabInfo);
  }
  
  // Load history on popup open
  async function loadHistory() {
    try {
      const result = await chrome.storage.local.get(['urlHistory']);
      if (result.urlHistory) {
        displayHistory(result.urlHistory);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }
  
  // Event listeners
  refreshBtn.addEventListener('click', loadCurrentTab);
  
  copyUrlBtn.addEventListener('click', async () => {
    if (currentTabInfo) {
      try {
        await navigator.clipboard.writeText(currentTabInfo.url);
        copyUrlBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyUrlBtn.textContent = 'Copy URL';
        }, 2000);
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  });
  
  clearHistoryBtn.addEventListener('click', async () => {
    try {
      await chrome.storage.local.remove(['urlHistory']);
      urlHistoryEl.innerHTML = '<p>History cleared</p>';
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  });
  
  // Initial load
  await loadCurrentTab();
  await loadHistory();
});