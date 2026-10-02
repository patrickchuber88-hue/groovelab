(function() {
  const form = document.getElementById('gateForm');
  const passwordInput = document.getElementById('passwordInput');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const btnSpinner = document.getElementById('btnSpinner');
  const arrowIcon = document.getElementById('arrowIcon');
  const errorBox = document.getElementById('errorBox');
  const errorMessage = document.getElementById('errorMessage');
  const gateCard = document.getElementById('gateCard');
  const togglePwdBtn = document.getElementById('togglePwdBtn');
  const eyeIcon = document.getElementById('eyeIcon');

  // Check URL parameters for errors (from native form fallback)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === '1') {
      showError('Ungültiger Zugangscode. Bitte prüfe deine Eingabe.');
      triggerShake();
    }
  } catch (_) {}

  // 1. Password Visibility Toggle
  if (togglePwdBtn && passwordInput) {
    togglePwdBtn.addEventListener('click', function() {
      const isPassword = passwordInput.getAttribute('type') === 'password';
      passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
      togglePwdBtn.setAttribute('aria-label', isPassword ? 'Passwort verbergen' : 'Passwort anzeigen');
      togglePwdBtn.setAttribute('title', isPassword ? 'Passwort verbergen' : 'Passwort anzeigen');
      
      if (isPassword) {
        eyeIcon.innerHTML = '<path d="m2 2 20 20"/><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>';
      } else {
        eyeIcon.innerHTML = '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>';
      }
    });
  }

  // 2. Fetch-based Submission with Smooth Shake Animation
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      const password = passwordInput ? passwordInput.value.trim() : '';
      if (!password) {
        showError('Bitte gib einen Zugangscode ein.');
        return;
      }

      setLoading(true);
      hideError();

      try {
        // Attempt login via the BFF gate endpoint
        const res = await fetch('/api/gate/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ password: password })
        });

        const data = await res.json().catch(function() { return {}; });

        if (res.ok && data.success) {
          if (btnText) btnText.textContent = 'Freigeschaltet...';
          // Smoothly reload the root URL; Nginx will now grant access to the full app
          window.location.href = data.redirect || '/';
        } else {
          showError(data.error || 'Ungültiger Zugangscode.');
          triggerShake();
          setLoading(false);
          if (passwordInput) {
            passwordInput.focus();
            passwordInput.select();
          }
        }
      } catch (err) {
        // Fallback to direct form submit if fetch fails (e.g. strict CSP or network)
        form.submit();
      }
    });
  }

  function setLoading(loading) {
    if (submitBtn) submitBtn.disabled = loading;
    if (btnSpinner) btnSpinner.style.display = loading ? 'inline-block' : 'none';
    if (arrowIcon) arrowIcon.style.display = loading ? 'none' : 'inline-block';
    if (btnText) btnText.textContent = loading ? 'Wird überprüft...' : 'Plattform freischalten';
  }

  function showError(msg) {
    if (errorMessage) errorMessage.textContent = msg;
    if (errorBox) errorBox.classList.add('visible');
  }

  function hideError() {
    if (errorBox) errorBox.classList.remove('visible');
  }

  function triggerShake() {
    if (!gateCard) return;
    gateCard.classList.remove('shake');
    // Force reflow
    void gateCard.offsetWidth;
    gateCard.classList.add('shake');
  }
})();
