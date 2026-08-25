/**
 * Enterprise+ DTO Schema Validator & Sanitizer
 * Protects against Mass Assignment (OWASP API3:2023 - Broken Object Property Level Authorization).
 * Ensures that client-side forms and mutations cannot inadvertently or maliciously overwrite
 * sensitive tenant, role, billing, or subscription flags in Supabase.
 */

// Forbidden privileged fields for regular user profile updates
const FORBIDDEN_USER_MUTATION_KEYS = new Set([
  'role',
  'roles',
  'school_id',
  'is_campus_active',
  'is_groovelab_active',
  'is_observer',
  'created_at',
  'id',
  'master_id',
  'subscription_bypass'
]);

// Forbidden privileged fields for regular school metadata updates
const FORBIDDEN_SCHOOL_MUTATION_KEYS = new Set([
  'id',
  'has_campus_subscription',
  'has_groovelab_subscription',
  'subscription_status',
  'storage_addon_gb',
  'storage_addon_status',
  'created_at',
  'owner_id'
]);

/**
 * Sanitizes a user profile update object by stripping all privileged system and role attributes.
 */
export function sanitizeUserProfileUpdate<T extends Record<string, any>>(data: T): Partial<T> {
  if (!data || typeof data !== 'object') return {};

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!FORBIDDEN_USER_MUTATION_KEYS.has(key)) {
      clean[key] = value;
    } else {
      console.warn(`[SchemaValidator] Mass-Assignment attempt blocked on protected user field: '${key}'`);
    }
  }
  return clean as Partial<T>;
}

/**
 * Sanitizes a school metadata update object by stripping all protected subscription and quota attributes.
 */
export function sanitizeSchoolDataUpdate<T extends Record<string, any>>(data: T): Partial<T> {
  if (!data || typeof data !== 'object') return {};

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!FORBIDDEN_SCHOOL_MUTATION_KEYS.has(key)) {
      clean[key] = value;
    } else {
      console.warn(`[SchemaValidator] Mass-Assignment attempt blocked on protected school field: '${key}'`);
    }
  }
  return clean as Partial<T>;
}
