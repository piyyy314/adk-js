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
    preserveKeys instanceof Set
      ? preserveKeys
      : preserveKeys.length > 0
        ? new Set(preserveKeys)
        : null;
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
    preserveKeys instanceof Set
      ? preserveKeys
      : preserveKeys.length > 0
        ? new Set(preserveKeys)
        : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Optimization: Avoid regex replace overhead if key doesn't contain an underscore.
const toCamelCaseKey = (key: string) =>
  key.indexOf('_') === -1
    ? key
    : key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      );

// Optimization: Avoid regex replace overhead if key doesn't contain uppercase letters.
const toSnakeCaseKey = (key: string) =>
  /[A-Z]/.test(key) ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase()) : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeysSet: Set<string> | null = null,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveKeysSet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    // Optimization: Pre-calculate whether preserveKeys is set to avoid
    // string concatenation allocations for fullPath when not needed,
    // and use Set.has for O(1) lookups instead of Array.includes O(M).
    const hasPreserveKeys =
      preserveKeysSet !== null && preserveKeysSet.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      const fullPath = hasPreserveKeys
        ? parentKey !== ''
          ? parentKey + '.' + key
          : key
        : '';

      if (hasPreserveKeys && preserveKeysSet.has(fullPath)) {
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
