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
const EMPTY_SET: ReadonlySet<string> = new Set();

export function toCamelCase(
  obj: unknown,
  preserveKeys: ReadonlyArray<string> | ReadonlySet<string> = EMPTY_SET,
): unknown {
  const preserveSet =
    preserveKeys instanceof Set
      ? preserveKeys
      : (preserveKeys as ReadonlyArray<string>).length === 0
        ? EMPTY_SET
        : new Set(preserveKeys);
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
  preserveKeys: ReadonlyArray<string> | ReadonlySet<string> = EMPTY_SET,
): unknown {
  const preserveSet =
    preserveKeys instanceof Set
      ? preserveKeys
      : (preserveKeys as ReadonlyArray<string>).length === 0
        ? EMPTY_SET
        : new Set(preserveKeys);
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
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

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveSet: ReadonlySet<string>,
): unknown {
  // Primitives and null return immediately (fast-path for leaf values)
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    const len = obj.length;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = toNotation(obj[i], converter, parentKey, preserveSet);
    }
    return result;
  }

  const source = obj as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  const keys = Object.keys(source);
  const keyCount = keys.length;

  if (preserveSet.size > 0) {
    for (let i = 0; i < keyCount; i++) {
      const key = keys[i];
      const convertedKey = converter(key);
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
    }
  } else {
    // Optimized fast path when there are no preserve keys: skips string path concatenation and set lookups
    for (let i = 0; i < keyCount; i++) {
      const key = keys[i];
      result[converter(key)] = toNotation(
        source[key],
        converter,
        '',
        preserveSet,
      );
    }
  }

  return result;
}
