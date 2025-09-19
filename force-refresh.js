// Force complete cache clear and refresh
console.log('🔄 AUTO-REFRESHING: Clearing all caches...');

// Clear all storage immediately
localStorage.clear();
sessionStorage.clear();

// Clear all caches
if ('caches' in window) {
  caches.keys().then(cacheNames => {
    cacheNames.forEach(cacheName => {
      caches.delete(cacheName);
    });
  });
}

// Unregister service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => registration.unregister());
  });
}

// Force immediate hard reload
window.location.href = window.location.href + '?v=' + Date.now();