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
  return toNotation(obj, toCamelCaseKey, '', preserveKeys);
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
  return toNotation(obj, toSnakeCaseKey, '', preserveKeys);
}

// Fast-path key conversion by checking if transformation is required prior to regex replacement.
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

const UPPERCASE_REGEX = /[A-Z]/;

const toSnakeCaseKey = (key: string) =>
  UPPERCASE_REGEX.test(key)
    ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase())
    : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeys: string[] = [],
): unknown {
  // Fast path for arrays: pre-allocate array size and use indexed loop to avoid callback overhead.
  if (Array.isArray(obj)) {
    const len = obj.length;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = toNotation(obj[i], converter, parentKey, preserveKeys);
    }
    return result;
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const hasPreserveKeys = preserveKeys.length > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      if (hasPreserveKeys) {
        // Only build fullPath when preserveKeys is non-empty to avoid unnecessary string concatenation
        const fullPath = parentKey !== '' ? parentKey + '.' + key : key;

        if (preserveKeys.includes(fullPath)) {
          result[convertedKey] = source[key];
          continue;
        }

        result[convertedKey] = toNotation(
          source[key],
          converter,
          fullPath,
          preserveKeys,
        );
      } else {
        result[convertedKey] = toNotation(
          source[key],
          converter,
          '',
          preserveKeys,
        );
      }
    }

    return result;
  }

  return obj;
}
