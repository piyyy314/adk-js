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
function toPreserveSet(
  preserveKeys: string[] | ReadonlySet<string>,
): ReadonlySet<string> | null {
  if (preserveKeys instanceof Set) {
    return preserveKeys.size > 0 ? preserveKeys : null;
  }
  if (Array.isArray(preserveKeys) && preserveKeys.length > 0) {
    return new Set(preserveKeys);
  }
  return null;
}

export function toCamelCase(
  obj: unknown,
  preserveKeys: string[] | ReadonlySet<string> = [],
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
  preserveKeys: string[] | ReadonlySet<string> = [],
): unknown {
  return toNotation(obj, toSnakeCaseKey, '', toPreserveSet(preserveKeys));
}

// Fast path: avoid Regex matching when key contains no underscore.
const toCamelCaseKey = (key: string) => {
  if (!key.includes('_')) return key;
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Fast path: avoid Regex matching when key contains no uppercase letter.
const UPPERCASE_REGEX = /[A-Z]/;
const toSnakeCaseKey = (key: string) => {
  if (!UPPERCASE_REGEX.test(key)) return key;
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeysSet: ReadonlySet<string> | null = null,
): unknown {
  if (Array.isArray(obj)) {
    const len = obj.length;
    const res = new Array(len);
    for (let i = 0; i < len; i++) {
      res[i] = toNotation(obj[i], converter, parentKey, preserveKeysSet);
    }
    return res;
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      if (preserveKeysSet !== null) {
        const fullPath = parentKey !== '' ? parentKey + '.' + key : key;
        if (preserveKeysSet.has(fullPath)) {
          result[convertedKey] = source[key];
          continue;
        }
        result[convertedKey] = toNotation(
          source[key],
          converter,
          fullPath,
          preserveKeysSet,
        );
      } else {
        result[convertedKey] = toNotation(
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
