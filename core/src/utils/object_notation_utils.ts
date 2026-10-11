/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * Converts an object with snake_case keys to camelCase keys.
 *
 * @param obj The object to convert.
 * @param preserveKeys Keys to preserve in their original form.
 * @returns The object with camelCase keys.
 */
export function toCamelCase(
  obj: unknown,
  preserveKeys: ReadonlyArray<string> | ReadonlySet<string> = EMPTY_SET,
): unknown {
  const preserveSet =
    preserveKeys instanceof Set
      ? preserveKeys
      : Array.isArray(preserveKeys) && preserveKeys.length > 0
        ? new Set(preserveKeys)
        : EMPTY_SET;

  // Performance optimization: Route through fast-path when preserveSet is empty.
  // Avoids inner-loop property path creation and condition checks during recursion.
  return preserveSet.size > 0
    ? toNotationWithPreserve(obj, toCamelCaseKey, '', preserveSet)
    : toNotationFast(obj, toCamelCaseKey);
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
  preserveKeys: ReadonlyArray<string> | ReadonlySet<string> = EMPTY_SET,
): unknown {
  const preserveSet =
    preserveKeys instanceof Set
      ? preserveKeys
      : Array.isArray(preserveKeys) && preserveKeys.length > 0
        ? new Set(preserveKeys)
        : EMPTY_SET;

  // Performance optimization: Route through fast-path when preserveSet is empty.
  // Avoids inner-loop property path creation and condition checks during recursion.
  return preserveSet.size > 0
    ? toNotationWithPreserve(obj, toSnakeCaseKey, '', preserveSet)
    : toNotationFast(obj, toSnakeCaseKey);
}

// Fast check to skip expensive regex replacement when keys have no underscores or uppercase letters.
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

const toSnakeCaseKey = (key: string) =>
  /[A-Z]/.test(key) ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase()) : key;

/**
 * Fast-path recursive notation transformation when no keys need to be preserved.
 * Eliminates path string concatenations, Set lookups, and extra recursion arguments.
 */
function toNotationFast(
  obj: unknown,
  converter: (key: string) => string,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => toNotationFast(item, converter));
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      result[converter(key)] = toNotationFast(source[key], converter);
    }

    return result;
  }

  return obj;
}

/**
 * Preserve-path recursive notation transformation when specific key paths are preserved.
 */
function toNotationWithPreserve(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveSet: ReadonlySet<string>,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotationWithPreserve(item, converter, parentKey, preserveSet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      const fullPath = parentKey !== '' ? parentKey + '.' + key : key;

      if (preserveSet.has(fullPath)) {
        result[convertedKey] = source[key];
      } else {
        result[convertedKey] = toNotationWithPreserve(
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
