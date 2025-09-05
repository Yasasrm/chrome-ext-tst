// Example: Block all social media during work hours
async function setupWorkSchedule() {
  const scheduleId = enhancedBlocker.scheduleManager.addSchedule({
    name: 'Work Hours',
    startTime: '09:00',
    endTime: '20:00',
    days: [1, 2, 3, 4, 5], // Monday to Friday
    enabled: true
  });

  // Enable social media category blocking
  enhancedBlocker.categoryBlocker.toggleCategory('social', true);
  enhancedBlocker.categoryBlocker.toggleCategory('entertainment', true);
}

// Example: Set up password protection
async function setupPasswordProtection() {
  await enhancedBlocker.passwordProtection.setPassword('mySecurePassword123');
}

// Example: Get comprehensive usage insights
async function getUsageReport() {
  const insights = await enhancedBlocker.usageAnalytics.getInsights();
  const focusStats = enhancedBlocker.focusManager.getSessionStats();
  
  console.log('Usage Report:', {
    insights,
    focusStats,
    currentStreak: focusStats.currentStreak
  });
}

// Example: Bulk whitelist productivity sites
function setupProductivityWhitelist() {
  const productivitySites = [
    'github.com',
    'stackoverflow.com',
    'docs.google.com',
    'notion.so',
    'trello.com',
    'slack.com',
    'zoom.us'
  ];

  productivitySites.forEach(site => {
    enhancedBlocker.whitelistManager.addSite(site);
  });
}