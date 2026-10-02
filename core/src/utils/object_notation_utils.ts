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

// Fast-path checking with includes('_') skips regex execution when no underscores exist.
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

// Fast-path checking with /[A-Z]/ skips regex execution when no uppercase letters exist.
const HAS_UPPERCASE_REGEX = /[A-Z]/;
const toSnakeCaseKey = (key: string) =>
  HAS_UPPERCASE_REGEX.test(key)
    ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase())
    : key;

/**
 * Performance optimizations applied:
 * 1. Convert preserveKeys array to a Set once at entry point for O(1) lookups instead of O(N) array scans.
 * 2. Skip parent key string formatting/concatenation when preserveKeys Set is empty/null.
 * 3. Use indexed for-loops over Object.keys for faster iteration without iterator allocation overhead.
 */
function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeysSet: Set<string> | null = null,
): unknown {
  if (Array.isArray(obj)) {
    const len = obj.length;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = toNotation(obj[i], converter, parentKey, preserveKeysSet);
    }
    return result;
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const keys = Object.keys(source);
    const hasPreserve = preserveKeysSet !== null && preserveKeysSet.size > 0;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const convertedKey = converter(key);

      if (hasPreserve) {
        const fullPath = parentKey !== '' ? parentKey + '.' + key : key;
        if (preserveKeysSet.has(fullPath)) {
          result[convertedKey] = source[key];
          continue;
        }
        result[convertedKey] = toNotation(
          source[key],
          converter,
          fullPath,
          preserveKeysSet,
        );
      } else {
        result[convertedKey] = toNotation(source[key], converter, '', null);
      }
    }

    return result;
  }

  return obj;
}
