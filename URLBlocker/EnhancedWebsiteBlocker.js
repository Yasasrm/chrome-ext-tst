// Enhanced WebsiteBlocker with all advanced features
class EnhancedWebsiteBlocker extends WebsiteBlocker {
  constructor() {
    super();
    this.scheduleManager = new ScheduleManager();
    this.passwordProtection = new PasswordProtection();
    this.categoryBlocker = new CategoryBlocker();
    this.usageAnalytics = new UsageAnalytics();
    this.whitelistManager = new WhitelistManager();
    this.focusManager = new FocusManager();
  }

  async init() {
    await super.init();
    // Initialize all advanced features
    await Promise.all([
      this.scheduleManager.init(),
      this.passwordProtection.init(),
      this.categoryBlocker.init(),
      this.whitelistManager.init(),
      this.focusManager.init()
    ]);
  }

  async isSiteBlocked(url) {
    // Check whitelist first
    if (this.whitelistManager.isWhitelisted(url)) {
      return false;
    }

    // Check temporary bypass
    if (this.whitelistManager.isTempAllowed(url)) {
      return false;
    }

    // Check schedule
    if (this.scheduleManager.isCurrentlyBlocked()) {
      return true;
    }

    // Check original blocking logic
    return super.isSiteBlocked(url);
  }

  async blockSite(tab) {
    // Record analytics
    await this.usageAnalytics.recordBlockedAttempt(tab.url);
    
    // Update focus session
    if (this.focusManager.currentSession) {
      this.focusManager.currentSession.blockedAttempts++;
    }

    // Execute blocking
    await super.blockSite(tab);
  }

  async bypassSite(tabId, duration, password = null) {
    // Check password if enabled
    if (this.passwordProtection.isEnabled) {
      const isValid = await this.passwordProtection.verifyPassword(password);
      if (!isValid) {
        throw new Error('Invalid password');
      }
    }

    const tab = await chrome.tabs.get(tabId);
    this.whitelistManager.temporaryAllow(tab.url, duration);
    
    // Reload the tab to apply bypass
    chrome.tabs.reload(tabId);
  }
}

// Initialize enhanced blocker
const enhancedBlocker = new EnhancedWebsiteBlocker();