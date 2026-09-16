/**
 * 🍎 Custom Apple-style Alert Modal
 * Replaces the native browser window.alert with an accessible, branded,
 * Apple-inspired modal matching Campus (green) and GrooveLab (yellow) design systems.
 */
export function initAppleAlert(): void {
  if (typeof window === 'undefined') return;

  window.alert = (message: string) => {
    // 1. Remove existing custom alert if any
    const existing = document.getElementById('apple-alert-root');
    if (existing) {
      existing.remove();
    }

    // 2. Create styling tag if not present
    if (!document.getElementById('apple-alert-styles')) {
      const style = document.createElement('style');
      style.id = 'apple-alert-styles';
      style.innerHTML = `
        @keyframes appleAlertFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes appleAlertScaleIn {
          from { transform: scale(0.95) translateY(10px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
        .apple-alert-close-btn:hover {
          transform: translateY(-1px);
          filter: brightness(1.05);
        }
        .apple-alert-close-btn:active {
          transform: translateY(0);
          filter: brightness(0.95);
        }
      `;
      document.head.appendChild(style);
    }

    // 3. Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'apple-alert-root';
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '999999';
    overlay.style.background = 'rgba(15, 23, 42, 0.3)';
    overlay.style.backdropFilter = 'blur(8px)';
    overlay.style.setProperty('-webkit-backdrop-filter', 'blur(8px)');
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.25s ease-out';
    overlay.style.fontFamily = 'inherit';

    // Determine type
    const msgLower = String(message).toLowerCase();
    const isError = msgLower.includes('fehler') || msgLower.includes('error') || msgLower.includes('fehlgeschlagen') || msgLower.includes('konnte nicht') || msgLower.includes('deaktiviert') || msgLower.includes('gesperrt');
    const isSuccess = msgLower.includes('erfolg') || msgLower.includes('erfolgreich') || msgLower.includes('glückwunsch') || msgLower.includes('kopiert') || msgLower.includes('bereit') || msgLower.includes('gespeichert') || msgLower.includes('zurückgesetzt') || msgLower.includes('gelöscht') || msgLower.includes('gesendet') || msgLower.includes('eingereicht') || msgLower.includes('akzeptiert') || msgLower.includes('✅') || msgLower.includes('🎉') || msgLower.includes('🤘') || msgLower.includes('🚀');

    let iconHtml = '';
    const activePlat = typeof window !== 'undefined' ? localStorage.getItem('groovelab_active_platform') : 'groovelab';
    let isCampus = activePlat === 'campus';
    if (typeof window !== 'undefined' && !isCampus) {
      if (document.body && (
        document.body.innerText.includes('Campus Räumlichkeiten') ||
        document.body.innerText.includes('Campus Stundenplan') ||
        document.body.innerText.includes('Campus')
      )) {
        isCampus = true;
      }
    }
    let titleText = isCampus ? 'Campus' : (activePlat === 'groovelab' ? 'GrooveLab' : 'Campus-Groovelab');
    let btnBackground = 'linear-gradient(135deg, #34a853, #34a853)';
    let btnShadow = '0 4px 12px rgba(52, 168, 83, 0.2)';
    
    if (isError) {
      titleText = 'Hinweis';
      btnBackground = 'linear-gradient(135deg, #ef4444, #dc2626)';
      btnShadow = '0 4px 12px rgba(239, 68, 68, 0.2)';
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(239, 68, 68, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        </div>
      `;
    } else if (isSuccess) {
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(52, 168, 83, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(52, 168, 83, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#34a853" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
      `;
    } else {
      btnBackground = 'linear-gradient(135deg, #eab308, #ca8a04)';
      btnShadow = '0 4px 12px rgba(234, 179, 8, 0.2)';
      iconHtml = `
        <div style="width: 56px; height: 56px; border-radius: 50%; background: rgba(234, 179, 8, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 16px; border: 1px solid rgba(234, 179, 8, 0.15);">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        </div>
      `;
    }

    // Create alert box
    const alertBox = document.createElement('div');
    alertBox.style.background = 'rgba(255, 255, 255, 0.95)';
    alertBox.style.backdropFilter = 'blur(20px)';
    alertBox.style.setProperty('-webkit-backdrop-filter', 'blur(20px)');
    alertBox.style.borderRadius = '24px';
    alertBox.style.width = '320px';
    alertBox.style.maxWidth = '90%';
    alertBox.style.display = 'flex';
    alertBox.style.flexDirection = 'column';
    alertBox.style.alignItems = 'center';
    alertBox.style.boxShadow = '0 20px 40px rgba(15, 23, 42, 0.15), 0 1px 3px rgba(15, 23, 42, 0.05)';
    alertBox.style.border = '1px solid rgba(226, 232, 240, 0.8)';
    alertBox.style.color = '#0f172a';
    alertBox.style.textAlign = 'center';
    alertBox.style.transform = 'scale(0.95) translateY(10px)';
    alertBox.style.transition = 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out';
    alertBox.style.boxSizing = 'border-box';
    alertBox.style.padding = '28px 24px 24px';

    // Safe innerHTML
    const escapedMessage = String(message)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;")
      .replace(/\n/g, "<br />");

    alertBox.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; width: 100%; box-sizing: border-box;">
        ${iconHtml}
        <div style="font-size: 1.25rem; font-weight: 900; color: #0f172a; margin-bottom: 8px;">
          ${titleText}
        </div>
        <div style="font-size: 0.95rem; font-weight: 600; color: #475569; line-height: 1.5; white-space: normal; word-break: break-word; margin-bottom: 24px;">
          ${escapedMessage}
        </div>
        <button class="apple-alert-close-btn" style="
          width: 100%;
          padding: 14px 20px;
          border-radius: 16px;
          background: ${btnBackground};
          border: none;
          color: white;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          outline: none;
          box-shadow: ${btnShadow};
          transition: all 0.2s ease;
          -webkit-tap-highlight-color: transparent;
          font-family: inherit;
        ">OK</button>
      </div>
    `;

    overlay.appendChild(alertBox);
    document.body.appendChild(overlay);

    // Trigger animations in next tick
    setTimeout(() => {
      overlay.style.opacity = '1';
      alertBox.style.transform = 'scale(1) translateY(0)';
    }, 15);

    const closeAlert = () => {
      overlay.style.opacity = '0';
      alertBox.style.transform = 'scale(0.95) translateY(10px)';
      setTimeout(() => {
        overlay.remove();
      }, 250);
    };

    const closeBtn = alertBox.querySelector('.apple-alert-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', closeAlert);
    }

    // Support ESC and ENTER key to close
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        closeAlert();
        document.removeEventListener('keydown', keyHandler);
      }
    };
    document.addEventListener('keydown', keyHandler);
  };
}
