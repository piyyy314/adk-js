/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ChildProcessWithoutNullStreams, exec, spawn} from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {promisify} from 'node:util';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';

const execAsync = promisify(exec);
const dirname = process.cwd();
const TEST_EXECUTION_TIMEOUT = 40000;

function sendInput(
  childProcess: ChildProcessWithoutNullStreams,
  input: string,
  waitText?: string,
): Promise<string> {
  childProcess.stdin.write(input);

  if (waitText) {
    return waitForOutput(childProcess, (output) => output.includes(waitText));
  }
  return getResponse(childProcess);
}

function waitForOutput(
  childProcess: ChildProcessWithoutNullStreams,
  matcher: (output: string) => boolean,
  timeout = 15_000,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let output = '';

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for output. Received:\n${output}`));
    }, timeout);

    const onData = (data: Buffer) => {
      output += data.toString();
      if (matcher(output)) {
        cleanup();
        resolve(output);
      }
    };

    const onExit = () => {
      cleanup();
      resolve(output);
    };

    const cleanup = () => {
      clearTimeout(timer);
      childProcess.stdout.off('data', onData);
      childProcess.off('exit', onExit);
    };

    childProcess.stdout.on('data', onData);
    childProcess.once('exit', onExit);
  });
}

function getResponse(
  childProcess: ChildProcessWithoutNullStreams,
): Promise<string> {
  return new Promise<string>((resolve) => {
    let output = '';
    let resolved = false;

    const onFinish = () => {
      if (!resolved) {
        resolve(output);
      }

      childProcess.stdout.off('data', onData);
      resolved = true;
    };

    const onData = (data: Buffer) => {
      output += data.toString();
    };

    childProcess.stdout.on('data', onData);
    childProcess.stdout.once('end', onFinish);
    childProcess.stdout.once('close', onFinish);
  });
}

describe.each(['__dirname', '__filename', 'import_meta_url'])(
  'Agent with %s',
  (testCaseName: string) => {
    const projectPath = path.join(
      dirname,
      'tests/integration/agent_loader',
      testCaseName,
    );

    beforeAll(async () => {
      await execAsync('npm install', {cwd: projectPath});
    }, TEST_EXECUTION_TIMEOUT);

    it(
      'should run agent and load params from file nearby via package.json script',
      async () => {
        const childProcess = spawn('npm', ['run', 'start'], {
          cwd: projectPath,
          shell: true,
        });

        let response = await sendInput(
          childProcess,
          'Tell me a joke.\n',
          "I'm stubby model response!",
        );

        expect(response.toString()).toContain("I'm stubby model response!");

        response = await sendInput(childProcess, 'exit\n');
        expect(response.toString()).toContain('');
      },
      TEST_EXECUTION_TIMEOUT,
    );

    afterAll(async () => {
      await fs
        .rm(path.join(projectPath, 'node_modules'), {
          recursive: true,
          force: true,
        })
        .catch(() => {});
      await fs
        .unlink(path.join(projectPath, 'package-lock.json'))
        .catch(() => {});
    }, TEST_EXECUTION_TIMEOUT);
  },
);
