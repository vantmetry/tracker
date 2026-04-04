/**
 * Regex collection for PII and credential masking.
 */
const PATTERNS = {
  // Matches standard email formats
  email: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,

  // Matches standard CC groupings: 4-4-4-[3-4] with required separators, or Amex 4-6-5 format.
  creditCard: /\b(?:\d{4}[-\s]){3}\d{3,4}\b|\b\d{4}[-\s]\d{6}[-\s]\d{5}\b/g,

  // US Social Security Numbers (SSN): 3-2-4 format
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

  // JWT Tokens (Header.Payload.Signature format starts with 'ey')
  jwt: /\bey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,

  // Generic secret detection (Bearer tokens, Basic auth, API keys)
  authHeader: /\b(Bearer|Basic|Token)\s+[A-Za-z0-9\-._~+/=]+/gi,
};

// Keys that suggest the value is highly sensitive and should be completely redacted
const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'authorization',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'session',
  'cookie',
  'credentials',
  'client_secret',
  'auth',
]);

/**
 * Masks sensitive patterns in a string.
 */
export function maskPII(input: string): string {
  let masked = input;

  // Mask emails: user@example.com -> u***@example.com
  masked = masked.replace(PATTERNS.email, (match) => {
    const parts = match.split('@');
    if (parts.length !== 2) {
      return match;
    }
    const [user, domain] = parts;
    const visibleUser = user.charAt(0);
    return `${visibleUser}***@${domain}`;
  });

  // Mask credit cards: replaces all but the last 4 digits.
  masked = masked.replace(PATTERNS.creditCard, (match) => {
    const cleaned = match.replace(/[-\s]/g, '');
    const last4 = cleaned.slice(-4);
    return '*'.repeat(cleaned.length - 4) + last4;
  });

  // Mask SSNs: replaces first 5 digits -> ***-**-1234
  masked = masked.replace(PATTERNS.ssn, (match) => {
    const last4 = match.slice(-4);
    return `***-**-${last4}`;
  });

  // Mask JWTs: eyJhb... -> [JWT REDACTED]
  masked = masked.replace(PATTERNS.jwt, '[JWT REDACTED]');

  // Mask Auth Headers
  masked = masked.replace(PATTERNS.authHeader, '$1 [TOKEN REDACTED]');

  return masked;
}

/**
 * Deeply masks PII in an object or array.
 * Handles sensitive keys by fully redacting their values.
 */
export function maskObjectPII<T>(obj: T, seen = new WeakSet()): T {
  // Handle primitives and nulls
  if (typeof obj === 'string') {
    return maskPII(obj) as unknown as T;
  }

  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Prevent circular reference infinite loops
  if (seen.has(obj as object)) {
    return '[Circular]' as unknown as T;
  }
  seen.add(obj as object);

  if (Array.isArray(obj)) {
    return obj.map((item) => maskObjectPII(item, seen)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Completely redact known sensitive keys
    if (SENSITIVE_KEYS.has(lowerKey) || Array.from(SENSITIVE_KEYS).some((k) => lowerKey.includes(k))) {
      result[key] = '[REDACTED]';
      continue;
    }

    if (typeof value === 'string') {
      result[key] = maskPII(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = maskObjectPII(value, seen);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
