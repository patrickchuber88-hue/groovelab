/**
 * 🛡️ Tier-1 Enterprise Environment Validator
 * Fails fast during boot if required environment variables are missing or malformed.
 */
import { z } from './ValidationEngine';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().min(10), // Basic URL check
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
}).strict();

export function validateEnv() {
  try {
    // Only parsing the explicitly required vars to avoid polluting strict()
    const parsed = envSchema.parse({
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    });
    console.log("✅ [Enterprise Security] Environment variables validated successfully.");
    return parsed;
  } catch (error: any) {
    console.error("❌ [CRITICAL] Environment Validation Failed. Halting Application.");
    console.error(error.errors || error.message);
    throw new Error("Missing or invalid environment configuration.");
  }
}

// Automatically validate on import
export const ENV = validateEnv();
