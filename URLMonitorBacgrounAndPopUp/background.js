chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only process when URL has changed and page is loading/complete
  if (changeInfo.url || changeInfo.status === 'complete') {
    console.log('Tab URL changed:', {
      tabId: tabId,
      url: tab.url,
      title: tab.title,
      status: changeInfo.status
    });
    
    // Store the current URL
    chrome.storage.local.set({
      currentUrl: tab.url,
      currentTitle: tab.title,
      timestamp: Date.now()
    });
  }
});

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    console.log('Active tab changed:', {
      tabId: activeInfo.tabId,
      url: tab.url,
      title: tab.title
    });
    
    // Update storage with new active tab
    chrome.storage.local.set({
      activeTabUrl: tab.url,
      activeTabTitle: tab.title,
      activeTabId: activeInfo.tabId,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error getting tab info:', error);
  }
});

// Function to get current active tab
async function getCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    return tab;
  } catch (error) {
    console.error('Error getting current tab:', error);
    return null;
  }
}