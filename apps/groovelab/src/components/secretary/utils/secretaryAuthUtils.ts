/**
 * Campus-Groovelab Secretary Auth Utilities
 * Authoritative Pin & QR Token generation routines
 */

export function generateStarterPin(role: string, isCampus: boolean, isGroovelab: boolean): string {
  let prefix = 'C';
  if (role === 'admin' || role === 'secretary') {
    prefix = 'V';
  } else if (isCampus && isGroovelab) {
    prefix = 'CG';
  } else if (isCampus) {
    prefix = 'C';
  } else if (isGroovelab) {
    prefix = 'G';
  } else {
    prefix = 'C';
  }
  const randomNum = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}-${randomNum}`;
}

export function generateSecureQrToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 't_';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
