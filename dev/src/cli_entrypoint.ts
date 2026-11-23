#! /usr/bin/env node
/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import {createProgram} from './cli/cli.js';

createProgram()
  .parseAsync(process.argv)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
