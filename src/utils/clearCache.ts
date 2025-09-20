// Cache clearing utility for Aether
// Ensures clean state after auth changes

export const clearAuthCache = () => {
  // Clear all Supabase auth data
  const keysToRemove = [
    'supabase.auth.token',
    'sb-suncgglbheilkeimwuxt-auth-token',
    'sb-suncgglbheilkeimwuxt-auth-token-code-verifier',
    'supabase.auth.refreshToken',
    'supabase.auth.currentSession'
  ];

  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  // Clear any Google OAuth remnants
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.includes('google') || key.includes('oauth')) {
      localStorage.removeItem(key);
    }
  });

  console.log('✅ Auth cache cleared');
};

export const clearAppCache = () => {
  // Clear all app-specific data except user preferences
  const preserveKeys = ['selectedModel', 'selectedPersona'];
  const preserved: Record<string, string> = {};

  // Save preferences
  preserveKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) preserved[key] = value;
  });

  // Clear everything
  localStorage.clear();
  sessionStorage.clear();

  // Restore preferences
  Object.entries(preserved).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });

  console.log('✅ App cache cleared (preferences preserved)');
};

// Version control for cache busting
const APP_VERSION = '2.0.0'; // Boss-only version
const VERSION_KEY = 'aether_app_version';

export const checkVersion = () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);

  if (storedVersion !== APP_VERSION) {
    console.log(`🔄 Version change detected: ${storedVersion} -> ${APP_VERSION}`);
    clearAuthCache();
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    return true; // Version changed
  }

  return false; // No change
};

// Force reload with cache bypass
export const hardReload = () => {
  clearAuthCache();
  clearAppCache();

  // Clear service worker cache if exists
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }

  // Force reload with cache bypass
  window.location.reload();
};