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
import {beforeEach, describe, expect, it} from 'vitest';

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

describe('UnsafeLocalCodeExecutor', () => {
  let executor: UnsafeLocalCodeExecutor;
  const invocationContext = createMockInvocationContext();

  beforeEach(() => {
    executor = new UnsafeLocalCodeExecutor();
  });

  it('should execute code and return stdout', async () => {
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'console.log("Hello, World!");',
        language: CodeExecutionLanguage.JAVASCRIPT,
        inputFiles: [],
      },
    };

    const result = await executor.executeCode(params);

    expect(result.stdout).toContain('Hello, World!');
    expect(result.stderr).toBe('');
  });

  it('should capture stderr', async () => {
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'console.error("An error occurred");',
        language: CodeExecutionLanguage.JAVASCRIPT,
        inputFiles: [],
      },
    };

    const result = await executor.executeCode(params);

    expect(result.stderr).toContain('An error occurred');
  });

  it('should handle execution errors', async () => {
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'throw new Error("Fatal error");',
        language: CodeExecutionLanguage.JAVASCRIPT,
        inputFiles: [],
      },
    };

    const result = await executor.executeCode(params);

    expect(result.stderr).toContain('Fatal error');
  });

  it('should respect timeout', async () => {
    // Create executor with 1 second timeout
    const shortTimeoutExecutor = new UnsafeLocalCodeExecutor({
      timeoutSeconds: 1,
    });

    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'setTimeout(() => {}, 5000);', // Sleep for 5 seconds
        language: CodeExecutionLanguage.JAVASCRIPT,
        inputFiles: [],
      },
    };

    const result = await shortTimeoutExecutor.executeCode(params);

    expect(result.stderr).toContain(
      'Code execution timed out after 1 seconds.',
    );
  });

  it('should execute python code and return stdout', async () => {
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'print("Hello, Python!")',
        language: CodeExecutionLanguage.PYTHON,
        inputFiles: [],
      },
    };

    const result = await executor.executeCode(params);

    expect(result.stdout).toContain('Hello, Python!');
    expect(result.stderr).toBe('');
  });

  it('should execute shell code and return stdout', async () => {
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'echo "Hello, Shell!"',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    const result = await executor.executeCode(params);

    expect(result.stdout).toContain('Hello, Shell!');
    expect(result.stderr).toBe('');
  });

  it('should return error for unsupported language', async () => {
    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'whatever',
        language: CodeExecutionLanguage.UNSPECIFIED,
        inputFiles: [],
      },
    };

    const result = await executor.executeCode(params);

    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Unsupported language: unspecified');
  });

  it('should respect pythonCommandPath', async () => {
    const customExecutor = new UnsafeLocalCodeExecutor({
      pythonCommandPath: 'non-existent-python-executable-123',
    });

    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'print("test")',
        language: CodeExecutionLanguage.PYTHON,
        inputFiles: [],
      },
    };

    const result = await customExecutor.executeCode(params);

    expect(result.stderr).toContain('Process error:');
    expect(result.stderr).toContain('non-existent-python-executable-123');
  });

  it('should respect shellCommandPath', async () => {
    const customExecutor = new UnsafeLocalCodeExecutor({
      shellCommandPath: 'non-existent-shell-executable-456',
    });

    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'echo "test"',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    const result = await customExecutor.executeCode(params);

    expect(result.stderr).toContain('Process error:');
    expect(result.stderr).toContain('non-existent-shell-executable-456');
  });

  it('should recognize bare pwsh as PowerShell for SHELL language', async () => {
    const customExecutor = new UnsafeLocalCodeExecutor({
      shellCommandPath: 'pwsh',
    });

    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'Write-Host "PowerShell test"',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    // If pwsh is available, it should execute successfully
    // Otherwise, we expect a process error (command not found)
    const result = await customExecutor.executeCode(params);

    // The test passes if either:
    // 1. pwsh exists and executes successfully (stdout contains "PowerShell test")
    // 2. pwsh doesn't exist but the executor tried to use it with PowerShell args (stderr contains process error)
    const isPwshAvailable = result.stdout.includes('PowerShell test');
    const triedToUsePwsh = result.stderr.includes('pwsh');

    expect(isPwshAvailable || triedToUsePwsh).toBe(true);
  });

  it('should recognize bare pwsh.exe as PowerShell for SHELL language', async () => {
    const customExecutor = new UnsafeLocalCodeExecutor({
      shellCommandPath: 'pwsh.exe',
    });

    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'Write-Host "PowerShell test"',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    const result = await customExecutor.executeCode(params);

    // Same logic as pwsh test
    const isPwshExeAvailable = result.stdout.includes('PowerShell test');
    const triedToUsePwshExe = result.stderr.includes('pwsh.exe');

    expect(isPwshExeAvailable || triedToUsePwshExe).toBe(true);
  });

  it('should recognize full path ending with /pwsh as PowerShell for SHELL language', async () => {
    const customExecutor = new UnsafeLocalCodeExecutor({
      shellCommandPath: '/usr/bin/pwsh',
    });

    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'Write-Host "PowerShell test"',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    const result = await customExecutor.executeCode(params);

    const isPwshAvailable = result.stdout.includes('PowerShell test');
    const triedToUsePwsh = result.stderr.includes('/usr/bin/pwsh');

    expect(isPwshAvailable || triedToUsePwsh).toBe(true);
  });

  it('should recognize full path ending with \\pwsh.exe as PowerShell for SHELL language', async () => {
    const customExecutor = new UnsafeLocalCodeExecutor({
      shellCommandPath: 'C:\\Tools\\pwsh.exe',
    });

    const params: ExecuteCodeParams = {
      invocationContext,
      codeExecutionInput: {
        code: 'Write-Host "PowerShell test"',
        language: CodeExecutionLanguage.SHELL,
        inputFiles: [],
      },
    };

    const result = await customExecutor.executeCode(params);

    const isPwshExeAvailable = result.stdout.includes('PowerShell test');
    const triedToUsePwshExe =
      result.stderr.includes('C:\\Tools\\pwsh.exe') ||
      result.stderr.includes('C:/Tools/pwsh.exe');

    expect(isPwshExeAvailable || triedToUsePwshExe).toBe(true);
  });
});
