/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  confirm,
  intro,
  isCancel,
  log,
  note,
  outro,
  password,
  select,
  spinner,
  text,
} from '@clack/prompts';
import * as readline from 'node:readline/promises';

/** Checks if the current process is running in a TTY environment. */
export function isTTY(): boolean {
  return process.stdout.isTTY;
}

/** A TTY-aware wrapper for Clack's intro. */
export function promptIntro(message: string): void {
  if (isTTY()) {
    intro(message);
  } else {
    console.log(`--- ${message} ---`);
  }
}

/** A TTY-aware wrapper for Clack's outro. */
export function promptOutro(message: string): void {
  if (isTTY()) {
    outro(message);
  } else {
    console.log(`--- ${message} ---`);
  }
}

/** A TTY-aware wrapper for Clack's note. */
export function promptNote(message: string, title?: string): void {
  if (isTTY()) {
    note(message, title);
  } else {
    if (title) console.log(`[${title}]`);
    console.log(message);
  }
}

/** A TTY-aware wrapper for Clack's step. */
export function promptStep(message: string): void {
  if (isTTY()) {
    log.step(message);
  } else {
    console.log(`- ${message}`);
  }
}

/** A TTY-aware wrapper for Clack's error log. */
export function promptError(message: string): void {
  if (isTTY()) {
    log.error(message);
  } else {
    console.error(`Error: ${message}`);
  }
}

/** A TTY-aware wrapper for Clack's text prompt. */
export async function promptText(options: {
  message: string;
  initialValue?: string;
  placeholder?: string;
}): Promise<string | symbol> {
  if (isTTY()) {
    return text(options);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const message = options.initialValue
      ? `${options.message} (default: ${options.initialValue}) `
      : options.message;
    const answer = await rl.question(message);
    return answer || options.initialValue || '';
  } finally {
    rl.close();
  }
}

/** A TTY-aware wrapper for Clack's select prompt. */
export async function promptSelect<T>(options: {
  message: string;
  options: Array<{label: string; value: T; hint?: string}>;
}): Promise<T | symbol> {
  if (isTTY()) {
    return select(options);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log(options.message);
    options.options.forEach((opt, i) => {
      console.log(`${i + 1}) ${opt.label}${opt.hint ? ` (${opt.hint})` : ''}`);
    });
    while (true) {
      const answer = await rl.question(`Choose [1-${options.options.length}]: `);
      const index = parseInt(answer, 10) - 1;
      if (index >= 0 && index < options.options.length) {
        return options.options[index].value;
      }
      console.log('Invalid selection.');
    }
  } finally {
    rl.close();
  }
}

/** A TTY-aware wrapper for Clack's confirm prompt. */
export async function promptConfirm(options: {
  message: string;
  initialValue?: boolean;
}): Promise<boolean | symbol> {
  if (isTTY()) {
    return confirm(options);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const defaultText =
      options.initialValue === true
        ? 'Y/n'
        : options.initialValue === false
          ? 'y/N'
          : 'y/n';
    const answer = await rl.question(`${options.message} (${defaultText}) `);
    if (!answer && options.initialValue !== undefined) {
      return options.initialValue;
    }
    return answer.toLowerCase().startsWith('y');
  } finally {
    rl.close();
  }
}

/** A TTY-aware wrapper for Clack's password prompt. */
export async function promptPassword(options: {
  message: string;
}): Promise<string | symbol> {
  if (isTTY()) {
    return password(options);
  }

  // Fallback for non-TTY: warn that input won't be masked.
  console.warn('Warning: Non-TTY environment detected. Input will not be masked.');
  return promptText(options);
}

/** A TTY-aware wrapper for Clack's spinner. */
export function createSpinner() {
  if (isTTY()) {
    return spinner();
  }

  return {
    start: (msg: string) => {
      console.log(`[loading] ${msg}`);
    },
    stop: (msg?: string, code?: number) => {
      if (msg) {
        const prefix = code === 0 || code === undefined ? '[done]' : '[failed]';
        console.log(`${prefix} ${msg}`);
      }
    },
  };
}
