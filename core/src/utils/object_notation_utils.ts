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
const EMPTY_SET = new Set<string>();
const UPPERCASE_REGEX = /[A-Z]/;

function toPreserveSet(preserveKeys: string[] | Set<string> = []): Set<string> {
  if (preserveKeys instanceof Set) {
    return preserveKeys;
  }
  if (!preserveKeys || preserveKeys.length === 0) {
    return EMPTY_SET;
  }
  return new Set(preserveKeys);
}

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
  return toNotation(obj, toCamelCaseKey, '', toPreserveSet(preserveKeys));
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
  return toNotation(obj, toSnakeCaseKey, '', toPreserveSet(preserveKeys));
}

// Optimization: Return key directly if it doesn't contain underscores to avoid regex replace cost
const toCamelCaseKey = (key: string) =>
  key.includes('_')
    ? key.replace(/_([a-z])/g, (_match: string, letter: string) =>
        letter.toUpperCase(),
      )
    : key;

// Optimization: Return key directly if it doesn't contain uppercase letters to avoid regex replace cost
const toSnakeCaseKey = (key: string) =>
  UPPERCASE_REGEX.test(key)
    ? key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase())
    : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveKeysSet: Set<string>,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveKeysSet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const hasPreservedKeys = preserveKeysSet.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);

      if (hasPreservedKeys) {
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
      } else {
        result[convertedKey] = toNotation(
          source[key],
          converter,
          '',
          preserveKeysSet,
        );
      }
    }

    return result;
  }

  return obj;
}
