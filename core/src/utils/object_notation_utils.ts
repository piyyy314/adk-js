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
  // Performance optimization: convert array of preserved keys to Set for O(1) lookup
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : null;
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
  preserveKeys: string[] = [],
): unknown {
  // Performance optimization: convert array of preserved keys to Set for O(1) lookup
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : null;
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Performance optimization: fast-path check avoids costly Regex allocation/execution when no underscore exists
const toCamelCaseKey = (key: string) => {
  if (!key.includes('_')) return key;
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Performance optimization: fast-path check avoids costly Regex execution when no uppercase letter exists
const toSnakeCaseKey = (key: string) => {
  if (!/[A-Z]/.test(key)) return key;
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveSet: Set<string> | null = null,
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
      // Performance optimization: only compute fullPath string concatenation if preserveSet exists
      const fullPath = preserveSet
        ? parentKey !== ''
          ? parentKey + '.' + key
          : key
        : '';

      if (preserveSet && preserveSet.has(fullPath)) {
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
