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
  // Performance optimization: convert preserveKeys array to a Set once at entry
  // for O(1) lookups instead of O(K) array includes checks per key.
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toCamelCaseKey, preserveSet, '');
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
  // Performance optimization: convert preserveKeys array to a Set once at entry
  // for O(1) lookups instead of O(K) array includes checks per key.
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toSnakeCaseKey, preserveSet, '');
}

// Performance optimization: Fast-path string check avoids running regular expressions
// on keys that do not contain underscores (e.g. 'id', 'name', 'type', 'role', 'text').
const toCamelCaseKey = (key: string) => {
  if (!key.includes('_')) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Performance optimization: Fast-path check avoids running regular expressions
// on keys that are already entirely lower-case.
const toSnakeCaseKey = (key: string) => {
  if (key === key.toLowerCase()) {
    return key;
  }
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  preserveSet: Set<string> | null,
  parentKey: string = '',
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, preserveSet, parentKey),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);

      // Performance optimization: Avoid constructing string fullPath when preserveSet is null
      // (which is true for all standard object conversions where preserveKeys is empty).
      const fullPath =
        preserveSet !== null
          ? parentKey !== ''
            ? parentKey + '.' + key
            : key
          : '';

      if (preserveSet !== null && preserveSet.has(fullPath)) {
        result[convertedKey] = source[key];
      } else {
        result[convertedKey] = toNotation(
          source[key],
          converter,
          preserveSet,
          fullPath,
        );
      }
    }

    return result;
  }

  return obj;
}
