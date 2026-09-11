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
  preserveKeys: string[] | ReadonlyArray<string> | Set<string> = [],
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
  preserveKeys: string[] | ReadonlyArray<string> | Set<string> = [],
): unknown {
  const preserveSet =
    preserveKeys instanceof Set
      ? preserveKeys
      : preserveKeys.length > 0
        ? new Set(preserveKeys)
        : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Fast-path: avoid regex replacement overhead if key contains no underscores
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

// Fast-path: avoid regex replacement overhead if key contains no uppercase letters
const toSnakeCaseKey = (key: string) =>
  /[A-Z]/.test(key)
    ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase())
    : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveKeysSet: Set<string> | null,
): unknown {
  if (Array.isArray(obj)) {
    const len = obj.length;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = toNotation(obj[i], converter, parentKey, preserveKeysSet);
    }
    return result;
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    if (preserveKeysSet !== null) {
      const keys = Object.keys(source);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const convertedKey = converter(key);
        const fullPath = parentKey !== '' ? parentKey + '.' + key : key;

        if (preserveKeysSet.has(fullPath)) {
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
    } else {
      // Fast path when no preserve keys are provided: skip path string creation and Set lookups completely
      const keys = Object.keys(source);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        result[converter(key)] = toNotation(
          source[key],
          converter,
          '',
          null,
        );
      }
    }

    return result;
  }

  return obj;
}
