/**
 * 🛡️ Tier-1 SaaS Enterprise+ Validation Engine (Zero-Dependency Zod-Alternative)
 * Prevents Mass Assignment, Prototype Pollution, and ensures strict runtime type checking.
 */

export class ValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

type ValidatorFn = (val: any) => string | null;

export class StringValidator {
  private checks: ValidatorFn[] = [];

  constructor() {
    this.checks.push((val) => typeof val === 'string' ? null : 'Must be a string');
  }

  min(length: number) {
    this.checks.push((val) => typeof val === 'string' && val.length >= length ? null : `Min length is ${length}`);
    return this;
  }

  max(length: number) {
    this.checks.push((val) => typeof val === 'string' && val.length <= length ? null : `Max length is ${length}`);
    return this;
  }

  email() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.checks.push((val) => typeof val === 'string' && emailRegex.test(val) ? null : 'Invalid email format');
    return this;
  }

  parse(val: any): string {
    for (const check of this.checks) {
      const err = check(val);
      if (err) throw new Error(err);
    }
    return val as string;
  }
}

export class ObjectValidator<T extends Record<string, any>> {
  private isStrict = false;

  constructor(private shape: T) {}

  strict() {
    this.isStrict = true;
    return this;
  }

  parse(val: any): Record<keyof T, any> {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) {
      throw new ValidationError({ _root: 'Expected an object payload' });
    }

    const errors: Record<string, string> = {};
    const parsedObj: any = {};

    // 1. Check for expected keys and validate
    for (const [key, validator] of Object.entries(this.shape)) {
      if (!(key in val)) {
        errors[key] = 'Required field missing';
        continue;
      }
      try {
        parsedObj[key] = (validator as any).parse(val[key]);
      } catch (err: any) {
        errors[key] = err.message;
      }
    }

    // 2. Strict mode: Prevent Mass Assignment / Unexpected fields
    if (this.isStrict) {
      for (const key of Object.keys(val)) {
        if (!(key in this.shape)) {
          errors[key] = 'Unrecognized field strictly forbidden';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new ValidationError(errors);
    }

    return parsedObj;
  }
}

export const z = {
  string: () => new StringValidator(),
  object: <T extends Record<string, any>>(shape: T) => new ObjectValidator<T>(shape),
};

// --- Enterprise Payloads (Examples) ---

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(255),
}).strict();

export const KioskAuthSchema = z.object({
  secret_token: z.string().min(16).max(255),
}).strict();

