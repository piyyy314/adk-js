/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts an object with snake_case keys to camelCase keys.
 *
 * @param obj The object to convert.
 * @param preserveKeys Keys to preserve in their original form.
 * @returns The object with camelCase keys.
 */
export function toCamelCase(
  obj: unknown,
  preserveKeys: string[] = [],
): unknown {
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toCamelCaseKey, '', preserveSet);
}

/**
 * Converts an object with camelCase keys to snake_case keys.
 *
 * @param obj The object to convert.
 * @param preserveKeys Keys to preserve in their original form.
 * @returns The object with snake_case keys.
 */
export function toSnakeCase(
  obj: unknown,
  preserveKeys: string[] = [],
): unknown {
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Fast-path string check: if key has no underscores, it's already camelCase/plain.
const toCamelCaseKey = (key: string): string => {
  if (!key.includes('_')) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Fast-path RegExp check: if key has no uppercase letters, it's already snake_case/plain.
const HAS_UPPERCASE = /[A-Z]/;
const toSnakeCaseKey = (key: string): string => {
  if (!HAS_UPPERCASE.test(key)) {
    return key;
  }
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

/**
 * Helper function to recursively transform object key notation.
 * Optimized for event and state processing performance:
 * 1. Uses a Set for preserveKeys lookups (O(1) vs O(P) array scan).
 * 2. Skips fullPath string allocation when preserveKeys is empty/null.
 * 3. Uses indexed loops to minimize iterator overhead during deep object traversal.
 */
function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveSet: Set<string> | null,
): unknown {
  if (Array.isArray(obj)) {
    const len = obj.length;
    const res = new Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = toNotation(obj[i], converter, parentKey, preserveSet);
    }
    return res;
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const keys = Object.keys(source);
    const keyLen = keys.length;

    if (preserveSet !== null) {
      for (let i = 0; i < keyLen; i++) {
        const key = keys[i];
        const convertedKey = converter(key);
        const fullPath = parentKey ? parentKey + '.' + key : key;

        if (preserveSet.has(fullPath)) {
          result[convertedKey] = source[key];
        } else {
          result[convertedKey] = toNotation(
            source[key],
            converter,
            fullPath,
            preserveSet,
          );
        }
      }
    } else {
      for (let i = 0; i < keyLen; i++) {
        const key = keys[i];
        const convertedKey = converter(key);
        result[convertedKey] = toNotation(source[key], converter, '', null);
      }
    }

    return result;
  }

  return obj;
}
