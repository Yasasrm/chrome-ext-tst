document.addEventListener('DOMContentLoaded', async function() {
  const enableToggle = document.getElementById('enableToggle');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const newSiteInput = document.getElementById('newSite');
  const addSiteBtn = document.getElementById('addSite');
  const siteList = document.getElementById('siteList');
  const currentTabInfo = document.getElementById('currentTabInfo');
  const bypassBtn = document.getElementById('bypassBtn');
  const statsDiv = document.getElementById('stats');
  
  let settings = {};
  let currentTab = null;
  
  // Load settings from background script
  async function loadSettings() {
    try {
      settings = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      updateUI();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }
  
  function updateUI() {
    // Update enable toggle
    enableToggle.classList.toggle('active', settings.isEnabled);
    
    // Update mode buttons
    modeButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === settings.blockingMode);
    });
    
    // Update site list
    updateSiteList();
  }
  
  function updateSiteList() {
    siteList.innerHTML = '';
    settings.blockedSites.forEach(site => {
      const siteItem = document.createElement('div');
      siteItem.className = 'site-item';
      siteItem.innerHTML = `
        <span>${site}</span>
        <button class="remove-btn" data-site="${site}">Remove</button>
      `;
      siteList.appendChild(siteItem);
    });
    
    // Add click listeners to remove buttons
    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', removeSite);
    });
  }
  
  async function removeSite(event) {
    const site = event.target.dataset.site;
    settings.blockedSites = settings.blockedSites.filter(s => s !== site);
    await chrome.runtime.sendMessage({
      type: 'UPDATE_BLOCKED_SITES',
      sites: settings.blockedSites
    });
    updateSiteList();
  }
  
  async function addSite() {
    const newSite = newSiteInput.value.trim().toLowerCase();
    if (newSite && !settings.blockedSites.includes(newSite)) {
      // Remove protocol and www if present
      const cleanSite = newSite.replace(/^https?:\/\//, '').replace(/^www\./, '');
      
      settings.blockedSites.push(cleanSite);
      await chrome.runtime.sendMessage({
        type: 'UPDATE_BLOCKED_SITES',
        sites: settings.blockedSites
      });
      
      newSiteInput.value = '';
      updateSiteList();
    }
  }
  
  async function getCurrentTabInfo() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;
      
      if (tab && tab.url && !tab.url.startsWith('chrome://')) {
        const domain = new URL(tab.url).hostname;
        const isBlocked = await chrome.runtime.sendMessage({
          type: 'IS_SITE_BLOCKED',
          url: tab.url
        });
        
        currentTabInfo.innerHTML = `
          <strong>${domain}</strong><br>
          <small>Status: ${isBlocked.blocked ? 'BLOCKED' : 'Allowed'}</small>
        `;
        
        bypassBtn.style.display = isBlocked.blocked ? 'block' : 'none';
      } else {
        currentTabInfo.innerHTML = 'No accessible tab';
        bypassBtn.style.display = 'none';
      }
    } catch (error) {
      console.error('Error getting current tab:', error);
      currentTabInfo.innerHTML = 'Error loading tab info';
    }
  }
  
  async function loadStats() {
    try {
      const result = await chrome.storage.local.get(['blockedAttempts']);
      const attempts = result.blockedAttempts || [];
      
      const today = new Date().toLocaleDateString();
      const todayAttempts = attempts.filter(a => a.date === today);
      const totalAttempts = attempts.length;
      
      statsDiv.innerHTML = `
        <div>Blocked today: ${todayAttempts.length}</div>
        <div>Total blocked: ${totalAttempts}</div>
        <div>Sites blocked: ${settings.blockedSites.length}</div>
      `;
    } catch (error) {
      console.error('Error loading stats:', error);
      statsDiv.innerHTML = 'Error loading statistics';
    }
  }
  
  // Event listeners
  enableToggle.addEventListener('click', async () => {
    settings.isEnabled = !settings.isEnabled;
    await chrome.runtime.sendMessage({
      type: 'TOGGLE_BLOCKER',
      enabled: settings.isEnabled
    });
    updateUI();
    getCurrentTabInfo(); // Refresh current tab status
  });
  
  modeButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      settings.blockingMode = btn.dataset.mode;
      await chrome.runtime.sendMessage({
        type: 'UPDATE_BLOCKING_MODE',
        mode: settings.blockingMode
      });
      updateUI();
    });
  });
  
  addSiteBtn.addEventListener('click', addSite);
  
  newSiteInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addSite();
    }
  });
  
  bypassBtn.addEventListener('click', async () => {
    if (currentTab) {
      await chrome.runtime.sendMessage({
        type: 'BYPASS_SITE',
        tabId: currentTab.id,
        duration: 300000 // 5 minutes
      });
      
      bypassBtn.textContent = 'Bypassed for 5 minutes';
      bypassBtn.disabled = true;
      
      setTimeout(() => {
        bypassBtn.textContent = 'Bypass for 5 minutes';
        bypassBtn.disabled = false;
        getCurrentTabInfo();
      }, 5000);
    }
  });
  
  // Initialize
  await loadSettings();
  await getCurrentTabInfo();
  await loadStats();
});