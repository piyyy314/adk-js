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
  // Convert preserveKeys array to a Set upfront for O(1) lookups during traversal.
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
  // Convert preserveKeys array to a Set upfront for O(1) lookups during traversal.
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Optimization: Skip regex replace engine if key contains no underscores.
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

// Optimization: Skip regex replace engine if key contains no uppercase characters.
const toSnakeCaseKey = (key: string) =>
  /[A-Z]/.test(key) ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase()) : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveKeysSet: Set<string> | null,
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

    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) {
        continue;
      }
      const convertedKey = converter(key);
      // Construct fullPath string only when preserveKeysSet is active.
      const fullPath =
        preserveKeysSet !== null
          ? parentKey !== ''
            ? parentKey + '.' + key
            : key
          : '';

      if (preserveKeysSet !== null && preserveKeysSet.has(fullPath)) {
        result[convertedKey] = source[key];
      } else {
        result[convertedKey] = toNotation(
          source[key],
          converter,
          fullPath,
          preserveKeysSet,
        );
      }
    }

    return result;
  }

  return obj;
}
