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

/**
 * Fast-path key converter: skips regex replacement when '_' is not present.
 * Reduces overhead on keys that do not require conversion.
 */
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

/**
 * Pre-compiled regex for testing presence of uppercase characters.
 */
const HAS_UPPERCASE_REGEX = /[A-Z]/;

/**
 * Fast-path key converter: skips regex replacement when uppercase letters are not present.
 */
const toSnakeCaseKey = (key: string) =>
  HAS_UPPERCASE_REGEX.test(key)
    ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase())
    : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveSet: Set<string> | null = null,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveSet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      // Performance optimization: Avoid string concatenation for fullPath when preserveSet is empty.
      // O(1) Set lookup replacing O(K) array searching.
      const hasPreserveSet = preserveSet !== null;
      const fullPath = hasPreserveSet
        ? parentKey !== ''
          ? parentKey + '.' + key
          : key
        : '';

      if (hasPreserveSet && preserveSet.has(fullPath)) {
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

    return result;
  }

  return obj;
}
