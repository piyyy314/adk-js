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

// Fast check to avoid regex replace overhead for keys that do not contain '_'.
const toCamelCaseKey = (key: string) => {
  if (key.indexOf('_') === -1) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Fast check to avoid regex replace overhead for keys that do not contain uppercase letters.
const UPPERCASE_REGEX = /[A-Z]/;
const toSnakeCaseKey = (key: string) => {
  if (!UPPERCASE_REGEX.test(key)) {
    return key;
  }
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveKeys: Set<string>,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveKeys),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const hasPreserveKeys = preserveKeys.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      // Skip path concatenation if there are no preserved keys.
      const fullPath = hasPreserveKeys
        ? parentKey !== ''
          ? parentKey + '.' + key
          : key
        : '';

      // Set.has() provides O(1) key check instead of O(N) array search per key.
      if (hasPreserveKeys && preserveKeys.has(fullPath)) {
        result[convertedKey] = source[key];
      } else {
        result[convertedKey] = toNotation(
          source[key],
          converter,
          fullPath,
          preserveKeys,
        );
      }
    }

    return result;
  }

  return obj;
}
