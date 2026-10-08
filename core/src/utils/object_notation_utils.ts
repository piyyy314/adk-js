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
  preserveKeys: ReadonlyArray<string> | ReadonlySet<string> = [],
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
  preserveKeys: ReadonlyArray<string> | ReadonlySet<string> = [],
): unknown {
  const preserveSet =
    preserveKeys instanceof Set ? preserveKeys : new Set(preserveKeys);
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
  /[A-Z]/.test(key)
    ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase())
    : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveSet: ReadonlySet<string>,
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
      const hasPreserveKeys = preserveSet.size > 0;
      const fullPath = hasPreserveKeys
        ? parentKey !== ''
          ? parentKey + '.' + key
          : key
        : '';

      if (hasPreserveKeys && preserveSet.has(fullPath)) {
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
