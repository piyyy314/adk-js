/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionDeclaration} from '@google/genai';

import {
  FunctionTool,
  ToolInputParameters,
  ToolOptions,
} from './function_tool.js';

/**
 * A function tool that returns the result asynchronously.
 *
 * This tool is used for long-running operations that may take a significant
 * amount of time to complete. The framework will call the function. Once the
 * function returns, the response will be returned asynchronously to the
 * framework which is identified by the function_call_id.
 */

const LONG_RUNNING_INSTRUCTION = `

NOTE: This is a long-running operation. Do not call this tool again if it has already returned some intermediate or pending status.`;

export class LongRunningFunctionTool<
  TParameters extends ToolInputParameters = undefined,
> extends FunctionTool<TParameters> {
  // Performance optimization: memoize declaration with long running instruction
  private cachedLongRunningDeclaration?: FunctionDeclaration;

  /**
   * The constructor acts as the user-friendly factory.
   * @param options The configuration for the tool.
   */
  constructor(options: ToolOptions<TParameters>) {
    super({...options, isLongRunning: true});
  }

  /**
   * Provide a schema for the function.
   * Caches the resulting declaration so long-running instructions and
   * parameter schemas are not repeatedly modified/generated on every turn.
   */
  override _getDeclaration(): FunctionDeclaration {
    if (!this.cachedLongRunningDeclaration) {
      const declaration = {...super._getDeclaration()};
      if (declaration.description) {
        declaration.description += LONG_RUNNING_INSTRUCTION;
      } else {
        declaration.description = LONG_RUNNING_INSTRUCTION.trimStart();
      }
      this.cachedLongRunningDeclaration = declaration;
    }
    return this.cachedLongRunningDeclaration;
  }
}
