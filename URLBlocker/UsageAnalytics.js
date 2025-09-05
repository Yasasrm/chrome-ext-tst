class UsageAnalytics {
  constructor() {
    this.sessionData = {
      blockedAttempts: 0,
      timesSaved: 0,
      topBlockedSites: new Map()
    };
  }

  async recordBlockedAttempt(url, timestamp = Date.now()) {
    try {
      const domain = new URL(url).hostname;
      
      // Update session data
      this.sessionData.blockedAttempts++;
      this.sessionData.timesSaved += 2.5; // Assume 2.5 minutes saved per block
      
      const currentCount = this.sessionData.topBlockedSites.get(domain) || 0;
      this.sessionData.topBlockedSites.set(domain, currentCount + 1);

      // Store in persistent storage
      const result = await chrome.storage.local.get(['dailyStats', 'weeklyStats']);
      
      const today = new Date().toDateString();
      const thisWeek = this.getWeekKey(new Date());
      
      // Update daily stats
      const dailyStats = result.dailyStats || {};
      if (!dailyStats[today]) {
        dailyStats[today] = { blocked: 0, sites: {} };
      }
      dailyStats[today].blocked++;
      dailyStats[today].sites[domain] = (dailyStats[today].sites[domain] || 0) + 1;

      // Update weekly stats
      const weeklyStats = result.weeklyStats || {};
      if (!weeklyStats[thisWeek]) {
        weeklyStats[thisWeek] = { blocked: 0, sites: {} };
      }
      weeklyStats[thisWeek].blocked++;
      weeklyStats[thisWeek].sites[domain] = (weeklyStats[thisWeek].sites[domain] || 0) + 1;

      await chrome.storage.local.set({ dailyStats, weeklyStats });
    } catch (error) {
      console.error('Error recording blocked attempt:', error);
    }
  }

  getWeekKey(date) {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay());
    return startOfWeek.toDateString();
  }

  async getInsights() {
    try {
      const result = await chrome.storage.local.get(['dailyStats', 'weeklyStats']);
      const dailyStats = result.dailyStats || {};
      const weeklyStats = result.weeklyStats || {};

      const today = new Date().toDateString();
      const thisWeek = this.getWeekKey(new Date());

      return {
        today: dailyStats[today] || { blocked: 0, sites: {} },
        thisWeek: weeklyStats[thisWeek] || { blocked: 0, sites: {} },
        session: this.sessionData,
        trends: this.calculateTrends(dailyStats),
        topSites: this.getTopBlockedSites(dailyStats)
      };
    } catch (error) {
      console.error('Error getting insights:', error);
      return null;
    }
  }

  calculateTrends(dailyStats) {
    const dates = Object.keys(dailyStats).sort().slice(-7); // Last 7 days
    return dates.map(date => ({
      date,
      blocked: dailyStats[date].blocked
    }));
  }

  getTopBlockedSites(dailyStats) {
    const siteCount = {};
    Object.values(dailyStats).forEach(day => {
      Object.entries(day.sites).forEach(([site, count]) => {
        siteCount[site] = (siteCount[site] || 0) + count;
      });
    });

    return Object.entries(siteCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([site, count]) => ({ site, count }));
  }
}