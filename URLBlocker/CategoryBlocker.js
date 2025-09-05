// Website categorization and bulk blocking
class CategoryBlocker {
  constructor() {
    this.categories = {
      'social': {
        name: 'Social Media',
        sites: ['facebook.com', 'twitter.com', 'instagram.com', 'snapchat.com', 'tiktok.com'],
        enabled: false
      },
      'entertainment': {
        name: 'Entertainment',
        sites: ['youtube.com', 'netflix.com', 'twitch.tv', 'hulu.com', 'disney.com'],
        enabled: false
      },
      'news': {
        name: 'News & Media',
        sites: ['cnn.com', 'bbc.com', 'reddit.com', 'buzzfeed.com', 'huffpost.com'],
        enabled: false
      },
      'shopping': {
        name: 'Shopping',
        sites: ['amazon.com', 'ebay.com', 'etsy.com', 'alibaba.com', 'walmart.com'],
        enabled: false
      },
      'games': {
        name: 'Games',
        sites: ['steam.com', 'roblox.com', 'minecraft.net', 'epicgames.com', 'origin.com'],
        enabled: false
      }
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['categorySettings']);
      if (result.categorySettings) {
        Object.assign(this.categories, result.categorySettings);
      }
    } catch (error) {
      console.error('Error loading category settings:', error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        categorySettings: this.categories
      });
    } catch (error) {
      console.error('Error saving category settings:', error);
    }
  }

  toggleCategory(categoryId, enabled) {
    if (this.categories[categoryId]) {
      this.categories[categoryId].enabled = enabled;
      this.saveSettings();
      return this.getBlockedSites();
    }
    return [];
  }

  getBlockedSites() {
    const blockedSites = [];
    Object.values(this.categories).forEach(category => {
      if (category.enabled) {
        blockedSites.push(...category.sites);
      }
    });
    return [...new Set(blockedSites)]; // Remove duplicates
  }

  addSiteToCategory(categoryId, site) {
    if (this.categories[categoryId]) {
      this.categories[categoryId].sites.push(site);
      this.saveSettings();
    }
  }
}