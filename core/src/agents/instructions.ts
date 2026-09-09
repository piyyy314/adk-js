/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {State} from '../sessions/state.js';
import {ReadonlyContext} from './readonly_context.js';

/**
 * Populates values in the instruction template, e.g. state, artifact, etc.
 *
 * ```
 * async function buildInstruction(
 *     readonlyContext: ReadonlyContext,
 * ): Promise<string> {
 *   return await injectSessionState(
 *       'You can inject a state variable like {var_name} or an artifact ' +
 *       '{artifact.file_name} into the instruction template.',
 *       readonlyContext,
 *   );
 * }
 *
 * const agent = new LlmAgent({
 *     model: 'gemini-1.5-flash',
 *     name: 'agent',
 *     instruction: buildInstruction,
 * });
 * ```
 *
 * @param template The instruction template.
 * @param readonlyContext The read-only context
 * @returns The instruction template with values populated.
 */
export async function injectSessionState(
  template: string,
  readonlyContext: ReadonlyContext,
): Promise<string> {
  const invocationContext = readonlyContext.invocationContext;

  /**
   * Replaces a matched string in the template with the corresponding value from
   * the context.
   *
   * @param match The matched string in the template.
   * @returns The replaced string.
   */
  async function replaceMatchedKeyWithItsValue(
    match: RegExpMatchArray,
  ): Promise<string> {
    // Step 1: extract the key from the match
    let key = match[0].replace(/^\{+/, '').replace(/\}+$/, '').trim();
    const isOptional = key.endsWith('?');
    if (isOptional) {
      key = key.slice(0, -1);
    }

    // Step 2: handle artifact injection
    if (key.startsWith('artifact.')) {
      const fileName = key.substring('artifact.'.length);
      if (invocationContext.artifactService === undefined) {
        throw new Error('Artifact service is not initialized.');
      }
      const artifact = await invocationContext.artifactService.loadArtifact({
        appName: invocationContext.session.appName,
        userId: invocationContext.session.userId,
        sessionId: invocationContext.session.id,
        filename: fileName,
      });
      if (!artifact) {
        throw new Error(`Artifact ${fileName} not found.`);
      }
      return String(artifact);
    }

    // Step 3: Handle state variable injection.
    if (!isValidStateName(key)) {
      return match[0];
    }

    if (key in invocationContext.session.state) {
      return String(invocationContext.session.state[key]);
    }

    if (isOptional) {
      return '';
    }

    throw new Error(`Context variable not found: \`${key}\`.`);
  }
  // Optimization: Collect all matches first, deduplicate async evaluations for identical keys,
  // and evaluate replacements concurrently using Promise.all to avoid sequential async I/O bottlenecks.
  const pattern = /\{+[^{}]*}+/g;
  const matches = Array.from(template.matchAll(pattern));
  if (matches.length === 0) {
    return template;
  }

  const uniqueMatchesMap = new Map<string, Promise<string>>();
  for (const match of matches) {
    const rawKey = match[0];
    if (!uniqueMatchesMap.has(rawKey)) {
      uniqueMatchesMap.set(rawKey, replaceMatchedKeyWithItsValue(match));
    }
  }

  // Await all unique replacement evaluations in parallel.
  const resolvedReplacements = new Map<string, string>();
  const keys = Array.from(uniqueMatchesMap.keys());
  const values = await Promise.all(uniqueMatchesMap.values());
  for (let i = 0; i < keys.length; i++) {
    resolvedReplacements.set(keys[i], values[i]);
  }

  const result: string[] = [];
  let lastEnd = 0;
  for (const match of matches) {
    result.push(template.slice(lastEnd, match.index));
    result.push(resolvedReplacements.get(match[0])!);
    lastEnd = match.index! + match[0].length;
  }
  result.push(template.slice(lastEnd));
  return result.join('');
}

/**
 * An IIFE that checks if the JavaScript runtime supports Unicode property
 * escapes (`\p{...}`) in regular expressions and returns a RegExp object that
 * is used for all subsequent calls to isIdentifier().
 */
const isIdentifierPattern = (() => {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/;
})();

/**
 * Checks if a string is a valid identifier.
 */
function isIdentifier(s: string): boolean {
  if (s === '' || s === undefined) {
    return false;
  }

  return isIdentifierPattern.test(s);
}

const VALID_PREFIXES = [State.APP_PREFIX, State.USER_PREFIX, State.TEMP_PREFIX];
/**
 * Checks if a variable name is a valid state name.
 * A valid state name is either:
 *   - <identifier>
 *   - <prefix>:<identifier>
 *
 * @param variableName The variable name to check.
 * @returns True if the variable name is valid, False otherwise.
 */
function isValidStateName(variableName: string): boolean {
  const parts = variableName.split(':');
  if (parts.length === 0 || parts.length > 2) {
    return false;
  }
  if (parts.length === 1) {
    return isIdentifier(variableName);
  }
  if (VALID_PREFIXES.includes(parts[0] + ':')) {
    return isIdentifier(parts[1]);
  }
  return false;
}
