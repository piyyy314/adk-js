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

const HAS_UPPERCASE = /[A-Z]/;

// Performance optimization: Reusable static replacer functions prevent closure allocation per key conversion
const toUpperReplacer = (_match: string, letter: string) =>
  letter.toUpperCase();
const toLowerReplacer = (g: string) => '_' + g.toLowerCase();

// Performance optimization: Fast-path skips regex if key does not contain '_'
const toCamelCaseKey = (key: string) => {
  if (!key.includes('_')) {
    return key;
  }
  return key.replace(/_([a-z])/g, toUpperReplacer);
};

// Performance optimization: Fast-path skips regex if key does not contain uppercase letters
const toSnakeCaseKey = (key: string) => {
  if (!HAS_UPPERCASE.test(key)) {
    return key;
  }
  return key.replace(/[A-Z]/g, toLowerReplacer);
};

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeys: string[] = [],
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveKeys),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const hasPreserveKeys = preserveKeys.length > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);

      // Performance optimization: Only construct fullPath and check preserveKeys if preserveKeys array is non-empty
      if (hasPreserveKeys) {
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
