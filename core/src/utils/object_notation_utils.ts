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
  const preserveKeySet =
    preserveKeys instanceof Set
      ? preserveKeys
      : preserveKeys.length > 0
        ? new Set(preserveKeys)
        : null;
  return toNotation(obj, toCamelCaseKey, '', preserveKeySet);
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
  const preserveKeySet =
    preserveKeys instanceof Set
      ? preserveKeys
      : preserveKeys.length > 0
        ? new Set(preserveKeys)
        : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveKeySet);
}

// Fast-path: Skip regex replacement if the key does not contain '_'
const toCamelCaseKey = (key: string) => {
  if (!key.includes('_')) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

const HAS_UPPERCASE = /[A-Z]/;

// Fast-path: Skip regex replacement if the key does not contain uppercase letters
const toSnakeCaseKey = (key: string) => {
  if (!HAS_UPPERCASE.test(key)) {
    return key;
  }
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeySet: Set<string> | null = null,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveKeySet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      const fullPath = parentKey !== '' ? parentKey + '.' + key : key;

      // O(1) set lookup instead of O(N) linear array scan
      if (preserveKeySet !== null && preserveKeySet.has(fullPath)) {
        result[convertedKey] = source[key];
      } else {
        result[convertedKey] = toNotation(
          source[key],
          converter,
          fullPath,
          preserveKeySet,
        );
      }
    }

    return result;
  }

  return obj;
}
