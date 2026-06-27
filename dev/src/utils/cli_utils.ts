import {isCancel, outro} from '@clack/prompts';

/**
 * Checks if the value is a cancellation from clack.
 */
export function isCancellation(value: unknown): value is symbol {
  if (isCancel(value)) {
    if (process.stdout.isTTY) {
      outro('Operation cancelled');
    }
    return true;
  }
  return false;
}
