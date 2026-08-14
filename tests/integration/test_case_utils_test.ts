/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {ChildProcessWithoutNullStreams} from 'node:child_process';
import {spawn} from 'node:child_process';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {BaseTestServer} from './test_case_utils.js';

/**
 * Minimal concrete subclass exposing the protected `startProcess` method so
 * it can be exercised directly.
 */
class TestServerHarness extends BaseTestServer {
  constructor() {
    super('localhost');
  }

  run(options: {
    spawnProcess: () => ChildProcessWithoutNullStreams;
    startMessage: string;
    successLogMessage: string;
    serverName: string;
    timeoutMs: number;
  }): Promise<void> {
    return this.startProcess(options);
  }
}

describe('BaseTestServer.startProcess', () => {
  let harness: TestServerHarness | undefined;

  afterEach(async () => {
    vi.restoreAllMocks();
    if (harness) {
      await harness.stop();
      harness = undefined;
    }
  });

  it('should log each stdout chunk and resolve once the start message is observed', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    harness = new TestServerHarness();

    await harness.run({
      spawnProcess: () =>
        spawn(process.execPath, [
          '-e',
          "console.log('booting up'); setTimeout(() => console.log('SERVER READY'), 20);",
        ]),
      startMessage: 'SERVER READY',
      successLogMessage: 'Harness reported success',
      serverName: 'HarnessServer',
      timeoutMs: 5000,
    });

    const stdoutLogCalls = logSpy.mock.calls.filter(([message]) =>
      String(message).startsWith('HarnessServer Stdout:'),
    );
    expect(stdoutLogCalls.length).toBeGreaterThan(0);
    expect(
      stdoutLogCalls.some(([message]) =>
        String(message).includes('SERVER READY'),
      ),
    ).toBe(true);
    expect(logSpy).toHaveBeenCalledWith('Harness reported success');
  });

  it('should reject with a timeout error when the start message never appears', async () => {
    harness = new TestServerHarness();

    await expect(
      harness.run({
        spawnProcess: () =>
          spawn(process.execPath, ['-e', 'setTimeout(() => {}, 10000);']),
        startMessage: 'NEVER APPEARS',
        successLogMessage: 'unused',
        serverName: 'SlowServer',
        timeoutMs: 200,
      }),
    ).rejects.toThrow('Timeout waiting for slowserver to start.');
  });

  it('should reject when the process exits before emitting the start message', async () => {
    harness = new TestServerHarness();

    await expect(
      harness.run({
        spawnProcess: () => spawn(process.execPath, ['-e', 'process.exit(1);']),
        startMessage: 'NEVER APPEARS',
        successLogMessage: 'unused',
        serverName: 'CrashingServer',
        timeoutMs: 5000,
      }),
    ).rejects.toThrow('CrashingServer exited prematurely with code 1');
  });

  it('should reject when the underlying process fails to spawn', async () => {
    harness = new TestServerHarness();

    await expect(
      harness.run({
        spawnProcess: () => spawn('this-binary-does-not-exist-xyz-123', []),
        startMessage: 'NEVER APPEARS',
        successLogMessage: 'unused',
        serverName: 'MissingBinaryServer',
        timeoutMs: 5000,
      }),
    ).rejects.toThrow(/Failed to start missingbinaryserver/);
  });

  it('should log stderr output via console.error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    harness = new TestServerHarness();

    await harness.run({
      spawnProcess: () =>
        spawn(process.execPath, [
          '-e',
          "console.error('oops'); setTimeout(() => console.log('READY NOW'), 20);",
        ]),
      startMessage: 'READY NOW',
      successLogMessage: 'done',
      serverName: 'StderrServer',
      timeoutMs: 5000,
    });

    expect(
      errorSpy.mock.calls.some(
        ([message]) =>
          String(message).includes('StderrServer Stderr:') &&
          String(message).includes('oops'),
      ),
    ).toBe(true);
  });
});