// Password protection for bypassing blocks
class PasswordProtection {
  constructor() {
    this.isEnabled = false;
    this.passwordHash = null;
    this.init();
  }

  async init() {
    const result = await chrome.storage.sync.get(['passwordEnabled', 'passwordHash']);
    this.isEnabled = result.passwordEnabled || false;
    this.passwordHash = result.passwordHash || null;
  }

  async setPassword(password) {
    if (!password) {
      this.isEnabled = false;
      this.passwordHash = null;
    } else {
      this.isEnabled = true;
      this.passwordHash = await this.hashPassword(password);
    }

    await chrome.storage.sync.set({
      passwordEnabled: this.isEnabled,
      passwordHash: this.passwordHash
    });
  }

  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async verifyPassword(password) {
    if (!this.isEnabled) return true;
    
    const hash = await this.hashPassword(password);
    return hash === this.passwordHash;
  }
}