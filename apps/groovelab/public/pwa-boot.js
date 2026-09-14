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

  function setOrAddLink(rel, href, type, sizes) {
    var selector = 'link[rel="' + rel + '"]' + (sizes ? '[sizes="' + sizes + '"]' : ':not([sizes])');
    var link = document.querySelector(selector);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      if (sizes) link.setAttribute('sizes', sizes);
      document.head.appendChild(link);
    }
    link.href = href;
    if (type) link.type = type;
  }

  setOrAddLink('manifest', manifestHref);
  setOrAddMeta('theme-color', themeColor);
  setOrAddMeta('apple-mobile-web-app-title', title);
  setOrAddMeta('apple-mobile-web-app-capable', 'yes');
  setOrAddMeta('mobile-web-app-capable', 'yes');
  setOrAddMeta('apple-mobile-web-app-status-bar-style', 'black-translucent');

  // Multi-size Apple Touch Icons for iPhone Retina, iPad Pro, iPad & older iOS devices
  setOrAddLink('apple-touch-icon', appleTouchIcon, 'image/png');
  setOrAddLink('apple-touch-icon', appleTouchIcon, 'image/png', '180x180');
  setOrAddLink('apple-touch-icon', appleTouchIcon, 'image/png', '167x167');
  setOrAddLink('apple-touch-icon', appleTouchIcon, 'image/png', '152x152');
  setOrAddLink('apple-touch-icon', appleTouchIcon, 'image/png', '120x120');

  setOrAddLink('icon', favicon, 'image/png');
})();
