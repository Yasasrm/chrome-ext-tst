// Break reminders and focus sessions
class FocusManager {
  constructor() {
    this.sessions = [];
    this.currentSession = null;
    this.breakReminders = {
      enabled: true,
      interval: 25 * 60 * 1000, // 25 minutes (Pomodoro)
      breakDuration: 5 * 60 * 1000 // 5 minutes
    };
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.startBreakTimer();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['focusSettings']);
      if (result.focusSettings) {
        Object.assign(this.breakReminders, result.focusSettings);
      }
    } catch (error) {
      console.error('Error loading focus settings:', error);
    }
  }

  startFocusSession(duration = this.breakReminders.interval) {
    this.currentSession = {
      startTime: Date.now(),
      duration: duration,
      blockedAttempts: 0
    };
    
    // Set timer for break reminder
    setTimeout(() => {
      this.showBreakNotification();
    }, duration);
  }

  endFocusSession() {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      this.sessions.push(this.currentSession);
      this.currentSession = null;
    }
  }

  showBreakNotification() {
    if (this.breakReminders.enabled) {
      chrome.notifications.create('break-reminder', {
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Focus Break Time!',
        message: 'You\'ve been focused for 25 minutes. Time for a 5-minute break!'
      });
    }
  }

  startBreakTimer() {
    if (this.breakReminders.enabled) {
      setInterval(() => {
        if (!this.currentSession) {
          this.startFocusSession();
        }
      }, 60000); // Check every minute
    }
  }

  getSessionStats() {
    const today = new Date().toDateString();
    const todaySessions = this.sessions.filter(session => 
      new Date(session.startTime).toDateString() === today
    );

    const totalFocusTime = todaySessions.reduce((total, session) => {
      const duration = session.endTime - session.startTime;
      return total + duration;
    }, 0);

    return {
      sessionsToday: todaySessions.length,
      totalFocusTime: Math.round(totalFocusTime / 60000), // Convert to minutes
      averageSession: todaySessions.length > 0 ? 
        Math.round(totalFocusTime / todaySessions.length / 60000) : 0,
      currentStreak: this.calculateStreak()
    };
  }

  calculateStreak() {
    // Calculate consecutive days with focus sessions
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i < 30; i++) { // Check last 30 days
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateString = checkDate.toDateString();
      
      const hasSessions = this.sessions.some(session => 
        new Date(session.startTime).toDateString() === dateString
      );
      
      if (hasSessions) {
        streak++;
      } else if (i > 0) { // Don't break streak on first day (today)
        break;
      }
    }
    
    return streak;
  }
}