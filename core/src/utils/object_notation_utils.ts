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
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : undefined;
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
  const preserveSet = preserveKeys.length > 0 ? new Set(preserveKeys) : undefined;
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

// Bounded LRU-like caching mechanism to optimize repeated key formatting operations
// while preventing memory leaks from dynamic keys.
const MAX_CACHE_SIZE = 1000;
const camelCaseCache = new Map<string, string>();
const snakeCaseCache = new Map<string, string>();

const toCamelCaseKey = (key: string) => {
  let cached = camelCaseCache.get(key);
  if (cached === undefined) {
    cached = key.replace(/_([a-z])/g, (_match: string, letter: string) =>
      letter.toUpperCase(),
    );
    // Prevent memory leaks by evicting older entries when limit is reached
    if (camelCaseCache.size >= MAX_CACHE_SIZE) {
      const firstKey = camelCaseCache.keys().next().value;
      if (firstKey !== undefined) {
        camelCaseCache.delete(firstKey);
      }
    }
    camelCaseCache.set(key, cached);
  }
  return cached;
};

const toSnakeCaseKey = (key: string) => {
  let cached = snakeCaseCache.get(key);
  if (cached === undefined) {
    cached = key.replace(/[A-Z]/g, (g) => '_' + g.toLowerCase());
    // Prevent memory leaks by evicting older entries when limit is reached
    if (snakeCaseCache.size >= MAX_CACHE_SIZE) {
      const firstKey = snakeCaseCache.keys().next().value;
      if (firstKey !== undefined) {
        snakeCaseCache.delete(firstKey);
      }
    }
    snakeCaseCache.set(key, cached);
  }
  return cached;
};

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string = '',
  preserveKeys?: Set<string>,
): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      toNotation(item, converter, parentKey, preserveKeys),
    );
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(source)) {
      const convertedKey = converter(key);
      const fullPath = parentKey !== '' ? parentKey + '.' + key : key;

      if (preserveKeys && preserveKeys.has(fullPath)) {
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
