import { z } from 'zod';

/**
 * 🛡️ TIER-1 ENTERPRISE+ INGRESS SCHEMAS (OWASP ASVS LEVEL 3)
 * Standard: Fail-Closed, Strict Whitelisting, Prototype Pollution Immunity
 */

// ── 1. Authentication Ingress ──
export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'E-Mail-Adresse ist erforderlich.' })
      .email('Ungültiges E-Mail-Format.')
      .max(255, 'E-Mail-Adresse darf maximal 255 Zeichen lang sein.')
      .trim(),
    password: z
      .string({ required_error: 'Passwort ist erforderlich.' })
      .min(1, 'Passwort darf nicht leer sein.')
      .max(256, 'Passwort überschreitet die Maximallänge von 256 Zeichen.'),
    isQrOrDeepLink: z.boolean().optional().default(false),
  })
  .strict({ message: 'Unerwartete Parameter im Login-Payload abgewiesen (Prototype Pollution Schutz).' });

export type LoginInput = z.infer<typeof loginSchema>;

// ── 2. Site Gate Ingress ──
export const gateLoginSchema = z
  .object({
    password: z
      .string({ required_error: 'Zugangscode ist erforderlich.' })
      .trim()
      .min(1, 'Zugangscode darf nicht leer sein.')
      .max(128, 'Zugangscode überschreitet das Limit von 128 Zeichen.'),
  })
  .strict({ message: 'Unerwartete Parameter im Gate-Payload abgewiesen.' });

export type GateLoginInput = z.infer<typeof gateLoginSchema>;

// ── 3. Direct-to-Storage Presign Ingress ──
export const ALLOWED_STORAGE_CONTEXTS = [
  'recordings',
  'loops',
  'audio_biography',
  'audio',
  'meisterwerk',
  'avatars',
  'feed-attachments',
  'homework',
  'practice_companion',
  'media',
  'band-media',
] as const;

export const ALLOWED_STORAGE_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const ALLOWED_STORAGE_BUCKETS = ['campus-assets', 'groovelab-assets'] as const;

export const presignUploadSchema = z
  .object({
    context: z.enum(ALLOWED_STORAGE_CONTEXTS, {
      errorMap: () => ({ message: 'Ungültiger Speicher-Kontext für Audio-/Medien-Ingestion.' }),
    }).default('audio'),
    extension: z
      .string()
      .regex(/^[a-zA-Z0-9]{2,10}$/, 'Dateiendung muss 2-10 alphanumerische Zeichen umfassen.')
      .default('webm'),
    contentType: z.enum(ALLOWED_STORAGE_MIME_TYPES, {
      errorMap: () => ({ message: 'Nicht autorisierter MIME-Type für Unterrichts- & Band-Medien.' }),
    }).default('audio/webm'),
    sizeBytes: z
      .number({ required_error: 'Dateigröße in Bytes ist erforderlich.' })
      .int('Dateigröße muss eine ganzzahlige Byte-Angabe sein.')
      .positive('Dateigröße muss positiv sein (> 0 Bytes).')
      .max(25 * 1024 * 1024, 'Dateigröße überschreitet die Obergrenze von 25 MB.'),
    schoolId: z
      .string()
      .uuid('schoolId muss eine gültige UUID sein.')
      .nullable()
      .optional(),
    studentId: z
      .string()
      .uuid('studentId muss eine gültige UUID sein.')
      .nullable()
      .optional(),
    uniqueId: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{1,64}$/, 'uniqueId darf nur alphanumerische Zeichen, Bindestriche und Unterstriche enthalten (max. 64 Zeichen).')
      .nullable()
      .optional(),
    bucket: z.enum(ALLOWED_STORAGE_BUCKETS).default('campus-assets'),
  })
  .strict({ message: 'Unerwartete Attribute im Presign-Payload abgewiesen (Mass Assignment Schutz).' });

export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

// ── 4. Sentinel Incident Ingress ──
export const sentinelIncidentSchema = z
  .object({
    incidentType: z
      .string({ required_error: 'incidentType ist erforderlich.' })
      .min(3, 'incidentType muss mindestens 3 Zeichen lang sein.')
      .max(100, 'incidentType darf maximal 100 Zeichen lang sein.')
      .regex(/^[A-Z0-9_-]+$/, 'incidentType darf nur Großbuchstaben, Ziffern, Unterstriche und Bindestriche enthalten.'),
    sourceComponent: z
      .string({ required_error: 'sourceComponent ist erforderlich.' })
      .min(2, 'sourceComponent muss mindestens 2 Zeichen lang sein.')
      .max(100, 'sourceComponent darf maximal 100 Zeichen lang sein.'),
    severity: z.enum(['INFO', 'WARNING', 'CRITICAL']).default('CRITICAL'),
    details: z.record(z.unknown()).default({}),
    traceId: z.string().max(128).optional(),
    schoolId: z.string().uuid('schoolId muss eine gültige UUID sein.').optional(),
  })
  .strict({ message: 'Unerwartete Parameter im Incident-Payload abgewiesen.' });

export type SentinelIncidentInput = z.infer<typeof sentinelIncidentSchema>;

// ── 5. Direct-to-Storage Presign Stream Ingress (Egress) ──
export const presignStreamSchema = z
  .object({
    filePath: z
      .string({ required_error: 'filePath ist erforderlich.' })
      .min(3, 'filePath muss mindestens 3 Zeichen lang sein.')
      .max(512, 'filePath darf maximal 512 Zeichen lang sein.')
      .refine(val => !val.includes('..') && !val.includes('//') && !val.includes('\\'), {
        message: 'Path Traversal oder ungültige Pfadsequenzen im filePath erkannt.'
      }),
    bucket: z.enum(ALLOWED_STORAGE_BUCKETS).default('campus-assets'),
    expiresInSeconds: z
      .number()
      .int()
      .min(60, 'Mindestgültigkeit beträgt 60 Sekunden.')
      .max(3600, 'Maximale Gültigkeit beträgt 3.600 Sekunden (UrhG § 73).')
      .default(1800),
  })
  .strict({ message: 'Unerwartete Parameter im Presign-Stream Payload abgewiesen.' });

export type PresignStreamInput = z.infer<typeof presignStreamSchema>;

// ── 6. Storage Delete Assets Ingress (GDPR Art. 17 / Purge) ──
export const deleteAssetsSchema = z
  .object({
    bucket: z.enum(ALLOWED_STORAGE_BUCKETS).default('campus-assets'),
    filePaths: z
      .array(
        z
          .string()
          .min(3, 'Jeder filePath muss mindestens 3 Zeichen lang sein.')
          .max(512, 'Jeder filePath darf maximal 512 Zeichen lang sein.')
          .refine(val => !val.includes('..') && !val.includes('\\'), {
            message: 'Path Traversal in einem der filePaths erkannt.'
          })
      )
      .min(1, 'Mindestens ein Dateipfad muss zum Löschen übergeben werden.')
      .max(100, 'Maximal 100 Dateien können pro Batch-Löschung verarbeitet werden.'),
  })
  .strict({ message: 'Unerwartete Parameter im Delete-Assets Payload abgewiesen.' });

export type DeleteAssetsInput = z.infer<typeof deleteAssetsSchema>;
