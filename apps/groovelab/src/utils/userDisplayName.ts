/**
 * Tier-1 SaaS Enterprise+ User Display Name Formatter
 * Standards: OWASP ASVS Level 3 / DSGVO Art. 25 (Privacy by Design)
 * 
 * Rules:
 * 1. Students: Anonymized to "First Name + Last Initial." (e.g. "Max M.").
 * 2. Teachers: Displayed with FULL NAME ("First Name + Last Name", e.g. "Severin Landenberger").
 * 3. Admins / Secretaries: Displayed with FULL NAME.
 * 4. Fallbacks: "Schüler/in", "Lehrkraft", "Nutzer".
 */

export interface UserNameLike {
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  role?: string | null;
}

/**
 * Anonymizes a last name to an uppercase single initial with period, e.g. "Mustermann" -> "M."
 * Handles pre-anonymized names like "M.", "M", or empty strings safely.
 */
export function anonymizeLastName(lastName?: string | null): string {
  if (!lastName) return '';
  const trimmed = lastName.trim();
  if (!trimmed) return '';
  
  // If already an initial like "M." or "M"
  if (trimmed.length <= 2 && trimmed.endsWith('.')) {
    return trimmed.toUpperCase();
  }
  if (trimmed.length === 1) {
    return `${trimmed.toUpperCase()}.`;
  }
  
  return `${trimmed.charAt(0).toUpperCase()}.`;
}

/**
 * Formats a student name strictly as "Vorname + Anfangsbuchstabe." (e.g., "Max M.")
 */
export function getStudentDisplayName(
  user?: UserNameLike | null,
  fallback: string = 'Schüler/in'
): string {
  if (!user) return fallback;

  const firstName = (user.first_name || '').trim();
  const lastName = (user.last_name || '').trim();

  if (firstName && lastName) {
    return `${firstName} ${anonymizeLastName(lastName)}`;
  }

  if (firstName) {
    return firstName;
  }

  // If only legacy name field exists
  if (user.name && user.name.trim()) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length > 1) {
      const first = parts[0];
      const last = parts.slice(1).join(' ');
      return `${first} ${anonymizeLastName(last)}`;
    }
    return parts[0];
  }

  return fallback;
}

/**
 * Formats a teacher name strictly with FULL NAME (e.g., "Severin Landenberger")
 * NEVER truncates to initials per platform guidelines.
 */
export function getTeacherDisplayName(
  user?: UserNameLike | null,
  fallback: string = 'Lehrkraft'
): string {
  if (!user) return fallback;

  const firstName = (user.first_name || '').trim();
  const lastName = (user.last_name || '').trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  if (user.name && user.name.trim()) {
    return user.name.trim();
  }

  return fallback;
}

/**
 * Role-aware display name formatter.
 * Automatically delegates to getStudentDisplayName or getTeacherDisplayName.
 */
export function formatUserDisplayName(
  user?: UserNameLike | null,
  contextRole?: string,
  fallback?: string
): string {
  if (!user) return fallback || 'Nutzer';

  const effectiveRole = contextRole || user.role || 'student';

  if (effectiveRole === 'student') {
    return getStudentDisplayName(user, fallback || 'Schüler/in');
  }

  if (effectiveRole === 'teacher') {
    return getTeacherDisplayName(user, fallback || 'Lehrkraft');
  }

  // Admins, secretaries, staff
  const firstName = (user.first_name || '').trim();
  const lastName = (user.last_name || '').trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  return firstName || user.name?.trim() || fallback || 'Nutzer';
}
