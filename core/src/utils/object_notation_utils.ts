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
  // Performance optimization: convert preserveKeys array to Set once at entry point
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
  // Performance optimization: convert preserveKeys array to Set once at entry point
  const preserveKeysSet =
    preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveKeysSet);
}

const HAS_UPPERCASE_REGEX = /[A-Z]/;

// Fast-path: Skip regex replacement if key has no underscores
const toCamelCaseKey = (key: string) => {
  if (!key.includes('_')) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Fast-path: Skip regex replacement if key has no uppercase letters
const toSnakeCaseKey = (key: string) => {
  if (!HAS_UPPERCASE_REGEX.test(key)) {
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
    const hasPreservedKeys =
      preserveKeysSet !== null && preserveKeysSet.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);

      // Fast-path: avoid string concatenation & Set lookups when preserveKeys is empty
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
          null,
        );
      }
    }

    return result;
  }

  return obj;
}
