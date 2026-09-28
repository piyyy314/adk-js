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

// Optimization: Fast-path when key contains no underscores to avoid regex allocation.
const toCamelCaseKey = (key: string) => {
  if (!key.includes('_')) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Optimization: Fast-path when key contains no uppercase letters to avoid regex allocation.
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
    const hasPreservedKeys =
      preserveKeysSet !== null && preserveKeysSet.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);

      // Optimization: Avoid path concatenation and O(N) array includes when no preserveKeys exist.
      if (hasPreservedKeys) {
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
        result[convertedKey] = toNotation(source[key], converter, '', null);
      }
    }

    return result;
  }

  return obj;
}
