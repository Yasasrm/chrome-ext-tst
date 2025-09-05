class ScheduleManager {
  constructor() {
    this.schedules = new Map();
    this.init();
  }

  async init() {
    await this.loadSchedules();
    this.startScheduleChecker();
  }

  async loadSchedules() {
    try {
      const result = await chrome.storage.sync.get(['blockingSchedules']);
      const schedules = result.blockingSchedules || [];
      
      schedules.forEach(schedule => {
        this.schedules.set(schedule.id, schedule);
      });
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }

  async saveSchedules() {
    try {
      await chrome.storage.sync.set({
        blockingSchedules: Array.from(this.schedules.values())
      });
    } catch (error) {
      console.error('Error saving schedules:', error);
    }
  }

  addSchedule(schedule) {
    schedule.id = Date.now().toString();
    this.schedules.set(schedule.id, schedule);
    this.saveSchedules();
    return schedule.id;
  }

  removeSchedule(id) {
    this.schedules.delete(id);
    this.saveSchedules();
  }

  isCurrentlyBlocked() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      const [startHour, startMin] = schedule.startTime.split(':').map(Number);
      const [endHour, endMin] = schedule.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (schedule.days.includes(currentDay) &&
          currentTime >= startMinutes &&
          currentTime <= endMinutes) {
        return true;
      }
    }

    return false;
  }

  startScheduleChecker() {
    // Check every minute if blocking should be enabled/disabled
    setInterval(() => {
      const shouldBlock = this.isCurrentlyBlocked();
      chrome.runtime.sendMessage({
        type: 'SCHEDULE_UPDATE',
        shouldBlock: shouldBlock
      });
    }, 60000); // Check every minute
  }
}