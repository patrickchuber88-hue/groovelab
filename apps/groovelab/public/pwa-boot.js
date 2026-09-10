// ==============================================================================
// Campus-Groovelab PWA & Dynamic Theme Bootloader
// Externalized to eliminate 'unsafe-inline' and satisfy W3C CSP Level 3 / Mozilla A+
// ==============================================================================
(function() {
  function safeGetItem(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  var params = new URLSearchParams(window.location.search);
  var platformParam = params.get('platform');
  var isGrooveLab = platformParam === 'groovelab' || 
                    (platformParam !== 'campus' && safeGetItem('groovelab_active_platform') === 'groovelab' && window.location.pathname.indexOf('/onboarding') === -1);
  
  var themeColor = isGrooveLab ? '#eab308' : '#34a853';
  var title = isGrooveLab ? 'GrooveLab' : 'Campus-Groovelab';
  var appleTouchIcon = isGrooveLab ? '/apple-touch-icon-groovelab.png' : '/apple-touch-icon.png';
  var favicon = isGrooveLab ? '/pwa-icon-groovelab.png' : '/pwa-icon.png';
  
  var manifestHref = isGrooveLab ? '/manifest-groovelab.json' : '/manifest.json';
  
  function setOrAddMeta(name, content) {
    var meta = document.querySelector('meta[name="' + name + '"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = name;
      document.head.appendChild(meta);
    }
    meta.content = content;
  }

  function setOrAddLink(rel, href, type) {
    var link = document.querySelector('link[rel="' + rel + '"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    link.href = href;
    if (type) link.type = type;
  }

  setOrAddLink('manifest', manifestHref);
  setOrAddMeta('theme-color', themeColor);
  setOrAddMeta('apple-mobile-web-app-title', title);
  setOrAddLink('apple-touch-icon', appleTouchIcon);
  setOrAddLink('icon', favicon, 'image/png');
  setOrAddMeta('apple-mobile-web-app-capable', 'yes');
})();
