/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CodeExecutionLanguage,
  ExecuteCodeParams,
  InvocationContext,
  LlmAgent,
  PluginManager,
  UnsafeLocalCodeExecutor,
  createSession,
} from '@google/adk';
import {spawn} from 'child_process';
import {EventEmitter} from 'node:events';
import {beforeEach, describe, expect, it, Mock, vi} from 'vitest';

// Mock `child_process` so we can inspect the exact command/args passed to
// `spawn` without actually launching a shell/PowerShell process.
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

function createMockInvocationContext(): InvocationContext {
  const agent = new LlmAgent({
    name: 'test_agent',
    model: 'gemini-2.5-flash',
  });

  return new InvocationContext({
    invocationId: 'test-invocation',
    agent,
    session: createSession({
      id: 'test-session',
      events: [],
      appName: 'test-app',
      userId: 'test-user',
    }),
    pluginManager: new PluginManager([]),
  });
}

type MockChildProcess = EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
};

function createMockChildProcess(): MockChildProcess {
  const child = new EventEmitter() as MockChildProcess;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  return child;
}

describe('UnsafeLocalCodeExecutor - PowerShell argument flags', () => {
  const invocationContext = createMockInvocationContext();
  let capturedCommand: string | undefined;
  let capturedArgs: string[] | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedCommand = undefined;
    capturedArgs = undefined;

    (spawn as unknown as Mock).mockImplementation(
      (command: string, args: string[]) => {
        capturedCommand = command;
        capturedArgs = args;
        const child = createMockChildProcess();
        // Resolve the executor's promise asynchronously, as a real spawned
        // process would.
        setImmediate(() => child.emit('close', 0, null));
        return child;
      },
    );
  });

  it('adds -NoProfile and -NonInteractive for SHELL language when shellCommandPath is powershell', async () => {
    const executor = new UnsafeLocalCodeExecutor({
      shellCommandPath: 'powershell',
    });
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'Write-Output "hi"',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    await executor.executeCode(params);

    expect(capturedCommand).toBe('powershell');
    expect(capturedArgs).toEqual([
      '-NoProfile',
      '-NonInteractive',
      '-NoLogo',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      expect.stringContaining('script'),
    ]);
  });

  it('matches shellCommandPath case-insensitively (e.g. "PowerShell.exe")', async () => {
    const executor = new UnsafeLocalCodeExecutor({
      shellCommandPath: 'C:\\Windows\\PowerShell.exe',
    });
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'Write-Output "hi"',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    await executor.executeCode(params);

    expect(capturedArgs).toEqual(
      expect.arrayContaining(['-NoProfile', '-NonInteractive']),
    );
  });

  it('adds -NoProfile and -NonInteractive for the POWERSHELL language', async () => {
    const executor = new UnsafeLocalCodeExecutor();
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'Write-Output "hi"',
        language: CodeExecutionLanguage.POWERSHELL,
        inputFiles: [],
      },
    };

    await executor.executeCode(params);

    expect(capturedArgs).toEqual([
      '-NoProfile',
      '-NonInteractive',
      '-NoLogo',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      expect.stringContaining('script'),
    ]);
  });

  it('does NOT add PowerShell-specific flags for SHELL language when shellCommandPath is cmd', async () => {
    const executor = new UnsafeLocalCodeExecutor({
      shellCommandPath: 'cmd.exe',
    });
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'echo hi',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    await executor.executeCode(params);

    expect(capturedCommand).toBe('cmd.exe');
    expect(capturedArgs).not.toContain('-NoProfile');
    expect(capturedArgs).not.toContain('-NonInteractive');
    expect(capturedArgs).toEqual(['/c', expect.stringContaining('script')]);
  });

  it('does NOT add PowerShell-specific flags for the WINDOWS_CMD language', async () => {
    const executor = new UnsafeLocalCodeExecutor();
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'echo hi',
        language: CodeExecutionLanguage.WINDOWS_CMD,
        inputFiles: [],
      },
    };

    await executor.executeCode(params);

    expect(capturedCommand).toBe('cmd.exe');
    expect(capturedArgs).not.toContain('-NoProfile');
    expect(capturedArgs).not.toContain('-NonInteractive');
    expect(capturedArgs).toEqual(['/c', expect.stringContaining('script')]);
  });
});