// Force complete cache clear and refresh
console.log('🔄 Force refreshing application...');

// Clear all storage
localStorage.clear();
sessionStorage.clear();

// Clear service worker cache if present
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for(let registration of registrations) {
      registration.unregister();
    }
  });
}

// Force reload with cache bypass
setTimeout(() => {
  window.location.reload(true);
}, 100);