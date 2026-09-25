// ==============================================================================
// Campus-Groovelab PWA Emergency Self-Healing & Localhost Cache Scrubber
// Externalized to eliminate 'unsafe-inline' and satisfy W3C CSP Level 3 / Mozilla A+
// ==============================================================================
(function() {
  var h = window.location.hostname;
  var isLocal = h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost') || h.endsWith('.local');
  if (isLocal) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        for (var i = 0; i < regs.length; i++) {
          regs[i].unregister();
        }
      }).catch(function() {});
    }
    if ('caches' in window) {
      caches.keys().then(function(keys) {
        for (var j = 0; j < keys.length; j++) {
          caches.delete(keys[j]);
        }
      }).catch(function() {});
    }
  }
})();

// 🛡️ Enterprise PWA Emergency Self-Healing Trap:
// If a fatal script chunk or syntax error occurs before React mounts, purge cached shells and reload fresh
window.addEventListener('error', function(e) {
  try {
    var rootEl = document.getElementById('root');
    var isMounted = rootEl && rootEl.children && rootEl.children.length > 0;
    if (!isMounted && !sessionStorage.getItem('__cg_pwa_recovery')) {
      sessionStorage.setItem('__cg_pwa_recovery', '1');
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          regs.forEach(function(r) { r.unregister(); });
        });
      }
      if ('caches' in window) {
        caches.keys().then(function(keys) {
          keys.forEach(function(k) { caches.delete(k); });
        });
      }
      setTimeout(function() {
        window.location.reload(true);
      }, 100);
    }
  } catch (_) {}
});
