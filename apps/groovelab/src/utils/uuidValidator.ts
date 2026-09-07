/**
 * 🛡️ Enterprise UUID Validator
 * High-performance regex check ensuring UUID columns receive only valid RFC 4122 UUIDs,
 * preventing PostgreSQL 22P02 syntax errors and PostgREST 400 Bad Request responses.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUUID = (val: unknown): val is string => {
  return typeof val === 'string' && UUID_REGEX.test(val.trim());
};
