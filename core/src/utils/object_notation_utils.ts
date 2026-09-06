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

// Bolt Optimization: Fast-path string check avoids costly Regex allocation and replace overhead
// when the key is already in the target case format.
const toCamelCaseKey = (key: string) => {
  if (!key.includes('_')) return key;
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

const SNAKE_CASE_REGEX = /[A-Z]/;
const toSnakeCaseKey = (key: string) => {
  if (!SNAKE_CASE_REGEX.test(key)) return key;
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

// Bolt Optimization:
// 1. Converts preserveKeys array to Set once at the top call for O(1) lookup vs O(N) array scans.
// 2. Skips path string concatenation (parentKey + '.' + key) when no preserveKeys are provided (common case).
function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveKeysSet: Set<string> | null,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveKeysSet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const hasPreserveKeys =
      preserveKeysSet !== null && preserveKeysSet.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      let fullPath = '';

      if (hasPreserveKeys) {
        fullPath = parentKey !== '' ? parentKey + '.' + key : key;
        if (preserveKeysSet.has(fullPath)) {
          result[convertedKey] = source[key];
          continue;
        }
      }

      result[convertedKey] = toNotation(
        source[key],
        converter,
        fullPath,
        preserveKeysSet,
      );
    }

    return result;
  }

  return obj;
}
