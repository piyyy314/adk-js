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
const EMPTY_SET: ReadonlySet<string> = new Set();

function getPreserveSet(
  preserveKeys: ReadonlyArray<string> | ReadonlySet<string>,
): ReadonlySet<string> {
  if (preserveKeys instanceof Set) {
    return preserveKeys;
  }
  if (Array.isArray(preserveKeys) && preserveKeys.length === 0) {
    return EMPTY_SET;
  }
  return new Set(preserveKeys);
}

export function toCamelCase(
  obj: unknown,
  preserveKeys: ReadonlyArray<string> | ReadonlySet<string> = [],
): unknown {
  const preserveSet = getPreserveSet(preserveKeys);
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
  const preserveSet = getPreserveSet(preserveKeys);
  return toNotation(obj, toSnakeCaseKey, '', preserveSet);
}

const upperReplacer = (_match: string, letter: string) => letter.toUpperCase();
const lowerReplacer = (g: string) => '_' + g.toLowerCase();

// Fast check to skip expensive regex replacement when keys have no underscores or uppercase letters.
const toCamelCaseKey = (key: string) =>
  key.includes('_') ? key.replace(/_([a-z])/g, upperReplacer) : key;

const toSnakeCaseKey = (key: string) =>
  /[A-Z]/.test(key) ? key.replace(/[A-Z]/g, lowerReplacer) : key;

function toNotation(
  obj: unknown,
  converter: (key: string) => string,
  parentKey: string,
  preserveSet: ReadonlySet<string>,
): unknown {
  if (Array.isArray(obj)) {
    const len = obj.length;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
      result[i] = toNotation(obj[i], converter, parentKey, preserveSet);
    }
    return result;
  }

  if (typeof obj === 'object' && obj !== null) {
    const source = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    const keys = Object.keys(source);
    const keysLen = keys.length;
    const hasPreserveKeys = preserveSet.size > 0;

    for (let i = 0; i < keysLen; i++) {
      const key = keys[i];
      const convertedKey = converter(key);

      if (hasPreserveKeys) {
        const fullPath = parentKey !== '' ? parentKey + '.' + key : key;

        if (preserveSet.has(fullPath)) {
          result[convertedKey] = source[key];
        } else {
          result[convertedKey] = toNotation(
            source[key],
            converter,
            fullPath,
            preserveSet,
          );
        }
      } else {
        result[convertedKey] = toNotation(
          source[key],
          converter,
          '',
          preserveSet,
        );
      }
    }

    return result;
  }

  return obj;
}
