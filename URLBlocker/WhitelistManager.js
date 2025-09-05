// Whitelist management for allowed sites during block periods
class WhitelistManager {
  constructor() {
    this.whitelist = new Set();
    this.tempAllowed = new Map(); // Temporary bypass storage
    this.init();
  }

  async init() {
    await this.loadWhitelist();
  }

  async loadWhitelist() {
    try {
      const result = await chrome.storage.sync.get(['whitelist']);
      this.whitelist = new Set(result.whitelist || [
        'gmail.com',
        'calendar.google.com',
        'docs.google.com',
        'github.com',
        'stackoverflow.com'
      ]);
    } catch (error) {
      console.error('Error loading whitelist:', error);
    }
  }

  async saveWhitelist() {
    try {
      await chrome.storage.sync.set({
        whitelist: Array.from(this.whitelist)
      });
    } catch (error) {
      console.error('Error saving whitelist:', error);
    }
  }

  addSite(site) {
    this.whitelist.add(site);
    this.saveWhitelist();
  }

  removeSite(site) {
    this.whitelist.delete(site);
    this.saveWhitelist();
  }

  isWhitelisted(url) {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      return Array.from(this.whitelist).some(whitelistedSite => {
        const whiteDomain = whitelistedSite.toLowerCase();
        return domain === whiteDomain || 
               domain.endsWith('.' + whiteDomain) ||
               domain === 'www.' + whiteDomain;
      });
    } catch (error) {
      return false;
    }
  }

  temporaryAllow(url, duration = 300000) { // 5 minutes default
    const domain = new URL(url).hostname;
    const expiry = Date.now() + duration;
    this.tempAllowed.set(domain, expiry);
    
    // Clean up expired entries
    setTimeout(() => {
      this.tempAllowed.delete(domain);
    }, duration);
  }

  isTempAllowed(url) {
    try {
      const domain = new URL(url).hostname;
      const expiry = this.tempAllowed.get(domain);
      return expiry && Date.now() < expiry;
    } catch (error) {
      return false;
    }
  }
}