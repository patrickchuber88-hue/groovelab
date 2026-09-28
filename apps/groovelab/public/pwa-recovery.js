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
// Intercepts fatal script errors, syntax errors, and unhandled module promise rejections before React mounts.
(function() {
  function isReactMounted() {
    var prebootEl = document.getElementById('pwa-preboot-stage');
    var rootEl = document.getElementById('root');
    // If preboot stage is gone and root has children, React has successfully taken over the DOM
    return !prebootEl && !!(rootEl && rootEl.children && rootEl.children.length > 0);
  }

  function purgeCachesAndReload() {
    if (sessionStorage.getItem('__cg_pwa_recovery')) return;
    sessionStorage.setItem('__cg_pwa_recovery', '1');
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        regs.forEach(function(r) { r.unregister(); });
      }).catch(function() {});
    }
    if ('caches' in window) {
      caches.keys().then(function(keys) {
        keys.forEach(function(k) { caches.delete(k); });
      }).catch(function() {});
    }
    setTimeout(function() {
      window.location.reload(true);
    }, 120);
  }

  // 1. Trap for synchronous & runtime script errors
  window.addEventListener('error', function(e) {
    try {
      if (!isReactMounted()) {
        console.warn('[PWA Self-Healing] Pre-mount error intercepted:', e.message || e);
        purgeCachesAndReload();
      }
    } catch (_) {}
  });

  // 2. Trap for asynchronous module loading & promise rejections (Vite dynamic chunks)
  window.addEventListener('unhandledrejection', function(e) {
    try {
      if (!isReactMounted()) {
        console.warn('[PWA Self-Healing] Pre-mount unhandled rejection intercepted:', e.reason);
        purgeCachesAndReload();
      }
    } catch (_) {}
  });

  // 3. 🛡️ Fail-Closed Bootstrap Watchdog (Deadlock & Freeze Immunity)
  // If after 7 seconds React has not mounted, offer the user an immediate recovery stage instead of an endless spinner
  setTimeout(function() {
    try {
      var prebootEl = document.getElementById('pwa-preboot-stage');
      if (prebootEl && !isReactMounted()) {
        prebootEl.innerHTML = '';
        var card = document.createElement('div');
        card.style.cssText = 'background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 28px 24px; max-width: 420px; width: 90%; box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.1); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;';
        
        var icon = document.createElement('div');
        icon.style.cssText = 'width: 44px; height: 44px; border-radius: 12px; background: #fefce8; border: 1px solid #fef08a; display: flex; align-items: center; justify-content: center; font-size: 20px;';
        icon.textContent = '⚡';
        card.appendChild(icon);

        var title = document.createElement('div');
        title.style.cssText = 'font-size: 15px; font-weight: 800; color: #0f172a;';
        title.textContent = 'Startvorgang dauert ungewöhnlich lange';
        card.appendChild(title);

        var desc = document.createElement('div');
        desc.style.cssText = 'font-size: 12.5px; color: #64748b; line-height: 1.45;';
        desc.textContent = 'Möglicherweise verhindert ein veralteter Browser-Cache oder ein Verbindungs-Timeout das Laden.';
        card.appendChild(desc);

        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display: flex; gap: 8px; width: 100%; margin-top: 6px;';

        var reloadBtn = document.createElement('button');
        reloadBtn.type = 'button';
        reloadBtn.style.cssText = 'flex: 1; padding: 10px 14px; background: #34a853; color: #ffffff; border: none; border-radius: 12px; font-size: 12.5px; font-weight: 800; cursor: pointer;';
        reloadBtn.textContent = 'Frisch neu laden';
        reloadBtn.addEventListener('click', function() {
          sessionStorage.removeItem('__cg_pwa_recovery');
          if ('caches' in window) {
            caches.keys().then(function(k) { k.forEach(function(x) { caches.delete(x); }); });
          }
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(r) { r.forEach(function(x) { x.unregister(); }); });
          }
          window.location.reload(true);
        });
        btnRow.appendChild(reloadBtn);

        var loginBtn = document.createElement('button');
        loginBtn.type = 'button';
        loginBtn.style.cssText = 'flex: 1; padding: 10px 14px; background: #f1f5f9; color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 12.5px; font-weight: 700; cursor: pointer;';
        loginBtn.textContent = 'Direkt zum Login';
        loginBtn.addEventListener('click', function() {
          window.location.href = '/login';
        });
        btnRow.appendChild(loginBtn);

        card.appendChild(btnRow);
        prebootEl.appendChild(card);
      }
    } catch (_) {}
  }, 7000);
})();
