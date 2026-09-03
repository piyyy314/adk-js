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
  preserveKeys: string[] | Set<string> = [],
): unknown {
  const preserveSet =
    preserveKeys instanceof Set ? preserveKeys : new Set(preserveKeys);
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
  preserveKeys: string[] | Set<string> = [],
): unknown {
  const preserveSet =
    preserveKeys instanceof Set ? preserveKeys : new Set(preserveKeys);
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

const toCamelCaseKey = (key: string) => {
  // Fast path: skip RegExp replace if key does not contain underscores
  if (key.indexOf('_') === -1) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

const UPPER_CASE_REGEX = /[A-Z]/;

const toSnakeCaseKey = (key: string) => {
  // Defensive reset in case of global/sticky flags, as per guidelines
  UPPER_CASE_REGEX.lastIndex = 0;
  // Fast path: skip RegExp replace if key does not contain uppercase letters
  if (!UPPER_CASE_REGEX.test(key)) {
    return key;
  }
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveKeysSet: Set<string>,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveKeysSet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const hasPreserveKeys = preserveKeysSet.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);

      if (hasPreserveKeys) {
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
        result[convertedKey] = toNotation(
          source[key],
          converter,
          '',
          preserveKeysSet,
        );
      }
    }

    return result;
  }

  return obj;
}
