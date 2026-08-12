/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {afterEach, describe, expect, it} from 'vitest';
import {
  getBooleanEnvVar,
  isBase64Encoded,
  base64Encode,
  base64Decode,
} from '../../src/utils/env_aware_utils.js';

describe('env_aware_utils', () => {
  describe('isBase64Encoded', () => {
    it('should return true for valid base64 encoded strings', () => {
      // "Hello world" encoded is "SGVsbG8gd29ybGQ="
      expect(isBase64Encoded('SGVsbG8gd29ybGQ=')).toBe(true);
      expect(isBase64Encoded('YWJjZA==')).toBe(true); // "abcd" padded to 8 chars
    });

    it('should return false for strings with invalid base64 characters', () => {
      expect(isBase64Encoded('SGVsbG8g!d29ybGQ=')).toBe(false);
      expect(isBase64Encoded('Hello, World!')).toBe(false);
      expect(isBase64Encoded('abc-def')).toBe(false);
      expect(isBase64Encoded('abc_def')).toBe(false);
    });

    it('should handle empty strings correctly', () => {
      expect(isBase64Encoded('')).toBe(true); // empty string is trivially valid base64 (decodes to empty)
    });

    it('should roundtrip encode and decode perfectly', () => {
      const original = 'Bolt is fast!';
      const encoded = base64Encode(original);
      expect(isBase64Encoded(encoded)).toBe(true);
      expect(base64Decode(encoded)).toBe(original);
    });
  });

  describe('getBooleanEnvVar', () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return true for "true" (case-insensitive)', () => {
      process.env = {...originalEnv, 'TEST_VAR': 'true'};
      expect(getBooleanEnvVar('TEST_VAR')).toBe(true);

      process.env = {...originalEnv, 'TEST_VAR': 'TRUE'};
      expect(getBooleanEnvVar('TEST_VAR')).toBe(true);

      process.env = {...originalEnv, 'TEST_VAR': 'True'};
      expect(getBooleanEnvVar('TEST_VAR')).toBe(true);
    });

    it('should return true for "1"', () => {
      process.env = {...originalEnv, 'TEST_VAR': '1'};
      expect(getBooleanEnvVar('TEST_VAR')).toBe(true);
    });

    it('should return false for "false"', () => {
      process.env = {...originalEnv, 'TEST_VAR': 'false'};
      expect(getBooleanEnvVar('TEST_VAR')).toBe(false);
    });

    it('should return false for "0"', () => {
      process.env = {...originalEnv, 'TEST_VAR': '0'};
      expect(getBooleanEnvVar('TEST_VAR')).toBe(false);
    });

    it('should return false for empty string', () => {
      process.env = {...originalEnv, 'TEST_VAR': ''};
      expect(getBooleanEnvVar('TEST_VAR')).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(getBooleanEnvVar('NON_EXISTENT_VAR')).toBe(false);
    });
  });
});
