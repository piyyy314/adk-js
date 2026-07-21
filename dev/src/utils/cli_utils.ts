/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {isCancel, outro} from '@clack/prompts';

/**
 * Handles cancellation of a clack prompt.
 * If the value is a cancel symbol, it prints a message and returns true.
 */
export function handleCancellation(value: unknown): value is symbol {
  if (isCancel(value)) {
    if (process.stdout.isTTY) {
      outro('Operation cancelled');
    }
    return true;
  }
  return false;
}
