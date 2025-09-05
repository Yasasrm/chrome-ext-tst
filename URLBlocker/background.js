class WebsiteBlocker {
  constructor() {
    this.blockedSites = new Set();
    this.isEnabled = true;
    this.blockingMode = 'redirect'; // 'redirect', 'close', 'warning'
    this.scheduleEnabled = false;
    this.blockSchedule = {
      startTime: '09:00',
      endTime: '17:00',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.setupTabMonitoring();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'blockedSites',
        'isEnabled',
        'blockingMode',
        'scheduleEnabled',
        'blockSchedule'
      ]);

      this.blockedSites = new Set(result.blockedSites || [
        'facebook.com',
        'twitter.com',
        'youtube.com',
        'instagram.com',
        'tiktok.com'
      ]);
      
      this.isEnabled = result.isEnabled !== false;
      this.blockingMode = result.blockingMode || 'redirect';
      this.scheduleEnabled = result.scheduleEnabled || false;
      this.blockSchedule = result.blockSchedule || this.blockSchedule;

      console.log('Blocker settings loaded:', {
        blockedSites: Array.from(this.blockedSites),
        isEnabled: this.isEnabled,
        mode: this.blockingMode
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        blockedSites: Array.from(this.blockedSites),
        isEnabled: this.isEnabled,
        blockingMode: this.blockingMode,
        scheduleEnabled: this.scheduleEnabled,
        blockSchedule: this.blockSchedule
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  setupEventListeners() {
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.url || changeInfo.status === 'complete') {
        this.checkAndBlockSite(tab);
      }
    });

    // Listen for new tab creation
    chrome.tabs.onCreated.addListener((tab) => {
      if (tab.url) {
        this.checkAndBlockSite(tab);
      }
    });

    // Listen for messages from popup/content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep channel open for async response
    });
  }

  setupTabMonitoring() {
    // Check all existing tabs on startup
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.url && !tab.url.startsWith('chrome://')) {
          this.checkAndBlockSite(tab);
        }
      });
    });
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'GET_SETTINGS':
        sendResponse({
          blockedSites: Array.from(this.blockedSites),
          isEnabled: this.isEnabled,
          blockingMode: this.blockingMode,
          scheduleEnabled: this.scheduleEnabled,
          blockSchedule: this.blockSchedule
        });
        break;

      case 'UPDATE_BLOCKED_SITES':
        this.blockedSites = new Set(message.sites);
        await this.saveSettings();
        sendResponse({ success: true });
        break;

      case 'TOGGLE_BLOCKER':
        this.isEnabled = message.enabled;
        await this.saveSettings();
        sendResponse({ success: true });
        break;

      case 'UPDATE_BLOCKING_MODE':
        this.blockingMode = message.mode;
        await this.saveSettings();
        sendResponse({ success: true });
        break;

      case 'BYPASS_SITE':
        await this.bypassSite(message.tabId, message.duration || 300000); // 5 minutes default
        sendResponse({ success: true });
        break;

      case 'IS_SITE_BLOCKED':
        const isBlocked = this.isSiteBlocked(message.url);
        sendResponse({ blocked: isBlocked });
        break;
    }
  }

  isSiteBlocked(url) {
    if (!this.isEnabled || !url) return false;

    // Check schedule if enabled
    if (this.scheduleEnabled && !this.isWithinBlockingSchedule()) {
      return false;
    }

    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      // Check exact domain and parent domains
      return Array.from(this.blockedSites).some(blockedSite => {
        const blockedDomain = blockedSite.toLowerCase();
        return domain === blockedDomain || 
               domain.endsWith('.' + blockedDomain) ||
               domain === 'www.' + blockedDomain;
      });
    } catch (error) {
      console.error('Error checking blocked site:', error);
      return false;
    }
  }

  isWithinBlockingSchedule() {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en', { weekday: 'long' }).toLowerCase();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    return this.blockSchedule.days.includes(currentDay) &&
           currentTime >= this.blockSchedule.startTime &&
           currentTime <= this.blockSchedule.endTime;
  }

  async checkAndBlockSite(tab) {
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }

    if (this.isSiteBlocked(tab.url)) {
      console.log('Blocking site:', tab.url);
      await this.blockSite(tab);
    }
  }

  async blockSite(tab) {
    switch (this.blockingMode) {
      case 'close':
        await this.closeSite(tab.id);
        break;
      case 'redirect':
        await this.redirectSite(tab.id, tab.url);
        break;
      case 'warning':
        await this.showWarning(tab.id, tab.url);
        break;
    }

    // Log blocked attempt
    await this.logBlockedAttempt(tab.url);
  }

  async closeSite(tabId) {
    try {
      await chrome.tabs.remove(tabId);
    } catch (error) {
      console.error('Error closing tab:', error);
    }
  }

  async redirectSite(tabId, url) {
    try {
      const blockedPageUrl = chrome.runtime.getURL('blocked.html') + 
                           `?blocked=${encodeURIComponent(url)}&tabId=${tabId}`;
      await chrome.tabs.update(tabId, { url: blockedPageUrl });
    } catch (error) {
      console.error('Error redirecting tab:', error);
    }
  }

  async showWarning(tabId, url) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: 'SHOW_WARNING',
        blockedUrl: url
      });
    } catch (error) {
      console.error('Error showing warning:', error);
    }
  }

  async bypassSite(tabId, duration) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const domain = new URL(tab.url).hostname;
      
      // Temporarily remove from blocked list
      this.blockedSites.delete(domain);
      
      // Set timer to re-add after duration
      setTimeout(() => {
        this.blockedSites.add(domain);
        this.saveSettings();
      }, duration);
      
      console.log(`Bypassed ${domain} for ${duration / 1000} seconds`);
    } catch (error) {
      console.error('Error bypassing site:', error);
    }
  }

  async logBlockedAttempt(url) {
    try {
      const result = await chrome.storage.local.get(['blockedAttempts']);
      const attempts = result.blockedAttempts || [];
      
      attempts.unshift({
        url: url,
        timestamp: Date.now(),
        date: new Date().toLocaleDateString()
      });
      
      // Keep only last 1000 attempts
      attempts.splice(1000);
      
      await chrome.storage.local.set({ blockedAttempts: attempts });
    } catch (error) {
      console.error('Error logging blocked attempt:', error);
    }
  }
}

// Initialize the website blocker
const websiteBlocker = new WebsiteBlocker();