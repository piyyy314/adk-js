/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {isCancel, outro} from '@clack/prompts';

/**
 * Handles user cancellation of an interactive CLI prompt.
 * If the value is a cancellation symbol, it prints an "Operation cancelled"
 * message (if TTY) and returns true.
 * @param value The value returned from a @clack/prompts interaction.
 * @returns true if the interaction was cancelled, false otherwise.
 */
export function handleCancellation(
  value: string | symbol | boolean,
): value is symbol {
  if (isCancel(value)) {
    if (process.stdout.isTTY) {
      outro('Operation cancelled');
    }
    return true;
  }
  return false;
}
