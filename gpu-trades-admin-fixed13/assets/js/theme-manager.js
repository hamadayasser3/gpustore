// ============================================================
// GPU Trades - Dark/Light Mode Theme Manager
// ============================================================

class ThemeManager {
  constructor() {
    this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    // IMPORTANT: must match the anti-flash key set in supabase-client.js
    this.storageKey = 'gpu_theme';
    this.init();
  }

  init() {
    this.loadTheme();
    this.darkModeQuery.addEventListener('change', () => this.handleSystemThemeChange());
    document.addEventListener('DOMContentLoaded', () => this.attachToggleButtons());
  }

  loadTheme() {
    const saved = localStorage.getItem(this.storageKey);
    
    if (saved) {
      this.setTheme(saved);
    } else {
      const systemDark = this.darkModeQuery.matches;
      this.setTheme(systemDark ? 'dark' : 'light');
    }
  }

  setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.storageKey, theme);
    this.updateMetaThemeColor(theme);
    this.broadcastChange(theme);
  }

  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'light' ? 'dark' : 'light';
    this.setTheme(next);
  }

  handleSystemThemeChange() {
    if (!localStorage.getItem(this.storageKey)) {
      const systemDark = this.darkModeQuery.matches;
      this.setTheme(systemDark ? 'dark' : 'light');
    }
  }

  updateMetaThemeColor(theme) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', 
        theme === 'dark' ? '#111317' : '#ffffff'
      );
    }
  }

  attachToggleButtons() {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', () => this.toggleTheme());
    });
  }

  broadcastChange(theme) {
    window.dispatchEvent(new CustomEvent('themechange', {
      detail: { theme }
    }));
  }

  getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  getPrefersDark() {
    return this.darkModeQuery.matches;
  }
}

// Initialize
const themeManager = new ThemeManager();
