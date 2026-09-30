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
  const preserveKeysSet =
    preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toCamelCaseKey, '', preserveKeysSet);
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
  const preserveKeysSet =
    preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveKeysSet);
}

// Fast-path checking: if string contains no '_', return key directly
// to avoid RegExp replace allocation and callback execution overhead.
const toCamelCaseKey = (key: string) => {
  if (key.indexOf('_') === -1) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Fast-path checking: if string contains no uppercase letter, return key directly
// to avoid RegExp replace allocation and callback execution overhead.
const toSnakeCaseKey = (key: string) => {
  if (!/[A-Z]/.test(key)) {
    return key;
  }
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

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

    // Performance optimization: when no keys are preserved (common case),
    // bypass fullPath string concatenation and Set lookups completely.
    if (preserveKeysSet !== null) {
      for (const key of Object.keys(source)) {
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
      for (const key of Object.keys(source)) {
        const convertedKey = converter(key);
        result[convertedKey] = toNotation(source[key], converter, '', null);
      }
    }

    return result;
  }

  return obj;
}
