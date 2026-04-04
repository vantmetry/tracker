import { describe, it, expect } from 'vitest';
import { maskPII, maskObjectPII } from './privacy';

describe('PII Masking', () => {
  describe('maskPII', () => {
    it('should mask emails', () => {
      expect(maskPII('Contact me at user@example.com')).toBe('Contact me at u***@example.com');
      expect(maskPII('Emails: a@b.com, foo.bar@domain.org')).toBe('Emails: a***@b.com, f***@domain.org');
    });

    it('should mask credit cards with standard separators', () => {
      // 16-digit Visa with spaces
      expect(maskPII('Card: 4111 1111 1111 1111')).toBe('Card: ************1111');
      // 16-digit Visa with dashes
      expect(maskPII('Card: 4111-1111-1111-1111')).toBe('Card: ************1111');
      // 15-digit Amex with spaces (4-6-5 format)
      expect(maskPII('Amex: 3400 000000 00000')).toBe('Amex: ***********0000');
    });

    it('should not mask raw digit strings without separators (too many false positives)', () => {
      // Without separators, unspaced runs of digits could be product IDs, timestamps, etc.
      expect(maskPII('Number: 5100000000000000')).toBe('Number: 5100000000000000');
    });

    it('should stay the same for non-PII strings', () => {
      const msg = 'Error: connection refused at localhost:8080';
      expect(maskPII(msg)).toBe(msg);
    });

    it('should mask SSNs', () => {
      expect(maskPII('My SSN is 123-45-6789')).toBe('My SSN is ***-**-6789');
      expect(maskPII('ID: 987654321')).toBe('ID: ***-**-4321');
    });

    it('should mask JWT tokens', () => {
      const token =
        'Header: eyJhbGciOiJIUzI1NiIsInR5cCI.eyJzdWIiOiIxMjM0NTY3ODkwIiw.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      expect(maskPII(token)).toBe('Header: [JWT REDACTED]');
    });

    it('should mask Auth headers', () => {
      expect(maskPII('Authorization: Bearer 12345abcd==')).toBe('Authorization: Bearer [TOKEN REDACTED]');
      expect(maskPII('Token abcdef123')).toBe('Token [TOKEN REDACTED]');
    });
  });

  describe('maskObjectPII', () => {
    it('should deeply mask objects and redact sensitive keys', () => {
      const input = {
        user: {
          email: 'test@example.com',
          name: 'John Doe',
          password: 'superSecretPassword123!',
        },
        metadata: [
          'Sent to admin@system.com',
          {
            note: 'Card 4222 2222 2222 2222',
            api_key: 'sk_live_123456789',
          },
        ],
      };

      const expected = {
        user: {
          email: 't***@example.com',
          name: 'John Doe',
          password: '[REDACTED]', // Key-based redaction
        },
        metadata: [
          'Sent to a***@system.com',
          {
            note: 'Card ************2222',
            api_key: '[REDACTED]', // Key-based redaction
          },
        ],
      };

      expect(maskObjectPII(input)).toEqual(expected);
    });

    it('should handle circular references safely', () => {
      type CircularMock = { email: string; self?: CircularMock };
      const circularObj: CircularMock = {
        email: 'hacker@bad.com',
      };
      circularObj.self = circularObj;

      const masked = maskObjectPII(circularObj);
      expect(masked.email).toBe('h***@bad.com');
      expect(masked.self).toBe('[Circular]');
    });
  });
});
