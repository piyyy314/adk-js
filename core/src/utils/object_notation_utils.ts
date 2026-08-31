/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Converts an object with snake_case keys to camelCase keys.
 *
 * Performance optimizations:
 * - Uses O(1) Set lookup instead of O(k) Array.prototype.includes for preserveKeys.
 * - Fast path check skips expensive regex replacement when key contains no underscore.
 * - Skips fullPath string concatenation when preserveKeys is empty.
 *
 * @param obj The object to convert.
 * @param preserveKeys Keys to preserve in their original form.
 * @returns The object with camelCase keys.
 */
export function toCamelCase(
  obj: unknown,
  preserveKeys: string[] = [],
): unknown {
  const preserveSet =
    preserveKeys.length > 0 ? new Set(preserveKeys) : undefined;
  return toNotation(obj, toCamelCaseKey, '', preserveSet);
}

/**
 * Converts an object with camelCase keys to snake_case keys.
 *
 * Performance optimizations:
 * - Uses O(1) Set lookup instead of O(k) Array.prototype.includes for preserveKeys.
 * - Fast path check skips expensive regex replacement when key contains no uppercase letter.
 * - Skips fullPath string concatenation when preserveKeys is empty.
 *
 * @param obj The object to convert.
 * @param preserveKeys Keys to preserve in their original form.
 * @returns The object with snake_case keys.
 */
export function toSnakeCase(
  obj: unknown,
  preserveKeys: string[] = [],
): unknown {
  const preserveSet =
    preserveKeys.length > 0 ? new Set(preserveKeys) : undefined;
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Fast path: avoid regex match & string allocations if key has no underscores.
const toCamelCaseKey = (key: string) =>
  key.indexOf('_') === -1
    ? key
    : key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      );

// Fast path: avoid regex match & string allocations if key has no uppercase letters.
const toSnakeCaseKey = (key: string) =>
  !/[A-Z]/.test(key)
    ? key
    : key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveSet?: Set<string>,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveSet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const hasPreserve = preserveSet !== undefined && preserveSet.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);

      if (hasPreserve) {
        const fullPath = parentKey !== '' ? parentKey + '.' + key : key;
        if (preserveSet.has(fullPath)) {
          result[convertedKey] = source[key];
        } else {
          result[convertedKey] = toNotation(
            source[key],
            converter,
            fullPath,
            preserveSet,
          );
        }
      } else {
        result[convertedKey] = toNotation(
          source[key],
          converter,
          '',
          preserveSet,
        );
      }
    }

    return result;
  }

  return obj;
}
