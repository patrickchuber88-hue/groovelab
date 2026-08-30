/**
 * Campus-Groovelab Secure Clipboard Manager
 * 
 * Copies sensitive credentials (PINs, tokens, master keys) to the system clipboard
 * and automatically clears them after 60 seconds to protect against clipboard snoopers.
 */

export async function secureCopyToClipboard(text: string, clearAfterSeconds = 60): Promise<boolean> {
  if (!text || typeof window === 'undefined') return false;

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    // Schedule automatic clearing of clipboard after timeout
    if (clearAfterSeconds > 0) {
      setTimeout(async () => {
        try {
          if (navigator?.clipboard?.readText) {
            const current = await navigator.clipboard.readText();
            if (current === text) {
              await navigator.clipboard.writeText('');
              console.log('[Security] Sensitive credential cleared from system clipboard.');
            }
          }
        } catch (e) {
          // Clipboard read permissions may be restricted in some browsers
        }
      }, clearAfterSeconds * 1000);
    }

    return true;
  } catch (err) {
    console.warn('[Security] Could not copy to clipboard:', err);
    return false;
  }
}
