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
  preserveKeys: string[] | ReadonlySet<string> = [],
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
  preserveKeys: string[] | ReadonlySet<string> = [],
): unknown {
  const preserveSet =
    preserveKeys instanceof Set ? preserveKeys : new Set(preserveKeys);
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Optimization: Fast check to skip expensive RegExp replace when no underscore exists
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

// Optimization: Fast check to skip expensive RegExp replace when no uppercase char exists
const toSnakeCaseKey = (key: string) =>
  /[A-Z]/.test(key)
    ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase())
    : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeys: ReadonlySet<string>,
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
      const fullPath = hasPreserveKeys
        ? parentKey !== ''
          ? parentKey + '.' + key
          : key
        : '';

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
