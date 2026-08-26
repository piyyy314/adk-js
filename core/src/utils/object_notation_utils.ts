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
  // Convert preserveKeys array to a Set for O(1) lookup when set is non-empty.
  const preserveSet =
    preserveKeys.length > 0 ? new Set(preserveKeys) : null;
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
  // Convert preserveKeys array to a Set for O(1) lookup when set is non-empty.
  const preserveSet =
    preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Optimization: Fast-path check using String.prototype.includes before regex replace.
// Avoids regex engine execution and closure allocations for keys without underscores.
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

// Optimization: Fast-path check using RegExp test before regex replace.
// Avoids regex replacement allocations for keys without uppercase letters.
const toSnakeCaseKey = (key: string) =>
  /[A-Z]/.test(key)
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
      // Optimization: Skip fullPath string concatenation when preserveSet is null (default).
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
          fullPath,
          preserveSet,
        );
      }
    }

    return result;
  }

  return obj;
}
