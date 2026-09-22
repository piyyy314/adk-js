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
  return toNotation(obj, toCamelCaseKey, '', preserveKeys);
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
  return toNotation(obj, toSnakeCaseKey, '', preserveKeys);
}

// Performance optimization: skip regex matching if key contains no underscores
const toCamelCaseKey = (key: string) => {
  if (key.indexOf('_') === -1) {
    return key;
  }
  return key.replace(/_([a-z])/g, (_match: string, letter: string) =>
    letter.toUpperCase(),
  );
};

// Performance optimization: skip regex matching if key contains no uppercase letters
const toSnakeCaseKey = (key: string) => {
  if (!/[A-Z]/.test(key)) {
    return key;
  }
  return key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
};

/**
 * Recursively converts object keys using the given converter function.
 */
function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeys: string[] | Set<string> = [],
): unknown {
  // Convert array to Set once at the top-level call to allow O(1) set lookups
  // instead of repeated O(N) array scans during recursion.
  const preserveSet =
    preserveKeys instanceof Set
      ? preserveKeys
      : preserveKeys.length > 0
        ? new Set(preserveKeys)
        : null;

  return internalToNotation(obj, converter, parentKey, preserveSet);
}

function internalToNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveSet: Set<string> | null,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      internalToNotation(item, converter, parentKey, preserveSet),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const hasPreserve = preserveSet !== null && preserveSet.size > 0;

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);

      if (hasPreserve) {
        // Only calculate dot-notation fullPath when preserveSet is present
        const fullPath = parentKey !== '' ? parentKey + '.' + key : key;
        if (preserveSet.has(fullPath)) {
          result[convertedKey] = source[key];
          continue;
        }
        result[convertedKey] = internalToNotation(
          source[key],
          converter,
          fullPath,
          preserveSet,
        );
      } else {
        // Skip fullPath string allocation when no keys are preserved
        result[convertedKey] = internalToNotation(
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
