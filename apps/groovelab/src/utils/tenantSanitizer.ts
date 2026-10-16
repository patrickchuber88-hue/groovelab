/**
 * 🛡️ Tenant Storage Sanitizer & Tombstone Reconciliation
 * Campus-Groovelab Enterprise+ Architecture (OWASP ASVS Level 3)
 * 
 * Bounded Context: Zero-Trust Storage & Multi-Tenancy Immunität
 * 
 * Bereinigt beim Kaltstart der Anwendung synchron (0ms Overhead)
 * verwaiste oder gelöschte Dummy-Schul-UUIDs aus localStorage,
 * sessionStorage und SWR-Caches, um Cache-Poisoning auszuschließen.
 */

export const BANNED_TOMBSTONE_SCHOOL_IDS = new Set<string>([
  '11111111-1111-1111-1111-111111111111', // Legacy Dummy "Groove Academy"
  '00000000-0000-0000-0000-000000000000', // Null UUID
]);

const SUSPECT_STORAGE_KEYS = [
  'groovelab_school_id',
  'groovelab_last_school_id',
  'campus_active_school_id',
  'kiosk_school_id'
];

/**
 * Desinfiziert clientseitige Speicher vor dem ersten Render.
 * Fail-Safe und vollkommen idempotent.
 */
export function sanitizeClientTenantStorage(): void {
  if (typeof window === 'undefined') return;

  const storageTargets: Storage[] = [];
  try { if (window.localStorage) storageTargets.push(window.localStorage); } catch {}
  try { if (window.sessionStorage) storageTargets.push(window.sessionStorage); } catch {}

  storageTargets.forEach(store => {
    try {
      // 1. Bekannte Schlüssel auf gesperrte IDs prüfen
      SUSPECT_STORAGE_KEYS.forEach(key => {
        const val = store.getItem(key);
        if (val && BANNED_TOMBSTONE_SCHOOL_IDS.has(val.trim())) {
          store.removeItem(key);
        }
      });

      // 2. Verwaiste SWR- und Mediathek-Caches mit gesperrten IDs entfernen
      for (let i = store.length - 1; i >= 0; i--) {
        const key = store.key(i);
        if (key) {
          for (const bannedId of BANNED_TOMBSTONE_SCHOOL_IDS) {
            if (key.includes(bannedId)) {
              store.removeItem(key);
              break;
            }
          }
        }
      }
    } catch {
      // Ignore private browsing storage restrictions
    }
  });
}
