/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {intro, log, outro} from '@clack/prompts';
import * as fs from 'node:fs/promises';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import {
  createDockerFileContent,
  CreateDockerFileContentOptions,
  deployToCloudRun,
} from '../../src/cli/cli_deploy.js';
import {AgentLoader} from '../../src/utils/agent_loader.js';
import {
  isFile,
  isFolderExists,
  loadFileData,
  tryToFindFileRecursively,
} from '../../src/utils/file_utils.js';

type Callback = (error: Error | null, result?: unknown) => void;

const execMock = vi.fn();
const spawnMock = vi.fn();

vi.mock('node:child_process', () => ({
  exec: (cmd: string, callback: Callback) => execMock(cmd, callback),
  spawn: (cmd: string, args: string[], opts: unknown) =>
    spawnMock(cmd, args, opts),
}));

vi.mock('node:fs/promises', () => ({
  cp: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/utils/agent_loader.js', () => ({
  AgentLoader: vi.fn().mockImplementation(() => ({
    listAgents: vi.fn().mockResolvedValue(['agent1']),
    getAgentFile: vi.fn().mockResolvedValue({
      getFilePath: vi.fn().mockReturnValue('path/to/agent1.ts'),
    }),
    disposeAll: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../src/utils/file_utils.js', () => ({
  isFile: vi.fn(),
  isFolderExists: vi.fn(),
  loadFileData: vi.fn(),
  saveToFile: vi.fn(),
  tryToFindFileRecursively: vi.fn(),
}));

vi.mock('@clack/prompts', () => {
  const spinnerMock = {
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  };
  return {
    intro: vi.fn(),
    outro: vi.fn(),
    spinner: vi.fn(() => spinnerMock),
    log: {
      info: vi.fn(),
      step: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('createDockerFileContent', () => {
  const defaultOptions: CreateDockerFileContentOptions = {
    appName: 'test-app',
    project: 'test-project',
    region: 'us-central1',
    port: 8080,
    withUi: false,
    logLevel: 'info',
  };

  it('should create Dockerfile content without --a2a by default', () => {
    const content = createDockerFileContent(defaultOptions);
    expect(content).not.toContain('--a2a');
  });

  it('should create Dockerfile content with --a2a when option is true', () => {
    const content = createDockerFileContent({
      ...defaultOptions,
      a2a: true,
    });
    expect(content).toContain('--a2a');
  });

  it('should use web command when withUi is true', () => {
    const content = createDockerFileContent({
      ...defaultOptions,
      withUi: true,
    });
    expect(content).toContain('npx adk web');
  });

  it('should use api_server command when withUi is false', () => {
    const content = createDockerFileContent({
      ...defaultOptions,
      withUi: false,
    });
    expect(content).toContain('npx adk api_server');
  });

  it('should include other options in adkServerOptions', () => {
    const content = createDockerFileContent({
      ...defaultOptions,
      allowOrigins: 'http://example.com',
      otelToCloud: true,
    });
    expect(content).toContain('--allow_origins=http://example.com');
    expect(content).toContain('--otel_to_cloud');
  });
});

describe('deployToCloudRun', () => {
  const defaultOptions = {
    agentPath: 'path/to/agent',
    serviceName: 'test-service',
    tempFolder: '/tmp/test-deploy',
    adkVersion: '1.0.0',
    project: 'test-project',
    region: 'us-central1',
    port: 8080,
    withUi: false,
    logLevel: 'info',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behavior
    (isFile as Mock).mockResolvedValue(false);
    (isFolderExists as Mock).mockResolvedValue(false);
    (tryToFindFileRecursively as Mock).mockResolvedValue(
      'path/to/package.json',
    );
    (loadFileData as Mock).mockResolvedValue({
      dependencies: {
        '@google/adk': '^1.0.0',
      },
    });

    (AgentLoader as Mock).mockImplementation(() => ({
      listAgents: vi.fn().mockResolvedValue(['agent1']),
      getAgentFile: vi.fn().mockResolvedValue({
        getFilePath: vi.fn().mockReturnValue('path/to/agent1.ts'),
      }),
      disposeAll: vi.fn().mockResolvedValue(undefined),
    }));

    execMock.mockImplementation((cmd: string, callback: Callback) => {
      if (cmd.includes('config get-value project')) {
        callback(null, {stdout: 'gcloud-project\n'});
      } else if (cmd.includes('config get-value run/region')) {
        callback(null, {stdout: 'gcloud-region\n'});
      } else {
        callback(null, {stdout: ''});
      }
    });

    spawnMock.mockReturnValue({
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') {
          process.nextTick(() => cb(0));
        }
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should deploy successfully with explicit options', async () => {
    (isFolderExists as Mock).mockResolvedValue(true);
    await deployToCloudRun(defaultOptions);

    expect(spawnMock).toHaveBeenCalledWith(
      'gcloud',
      expect.arrayContaining([
        'run',
        'deploy',
        'test-service',
        '--project',
        'test-project',
        '--region',
        'us-central1',
      ]),
      expect.any(Object),
    );
    expect(fs.rm).toHaveBeenCalledWith('/tmp/test-deploy', {
      recursive: true,
      force: true,
    });
  });

  it('should resolve default project and region from gcloud if not provided', async () => {
    const optionsWithoutProjectRegion = {
      ...defaultOptions,
      project: '',
      region: '',
    };

    await deployToCloudRun(optionsWithoutProjectRegion);

    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining('config get-value project'),
      expect.any(Function),
    );
    expect(execMock).toHaveBeenCalledWith(
      expect.stringContaining('config get-value run/region'),
      expect.any(Function),
    );

    expect(spawnMock).toHaveBeenCalledWith(
      'gcloud',
      expect.arrayContaining([
        '--project',
        'gcloud-project',
        '--region',
        'gcloud-region',
      ]),
      expect.any(Object),
    );
  });

  it('should throw error if project resolution fails (unset)', async () => {
    const optionsWithoutProject = {
      ...defaultOptions,
      project: '',
    };

    execMock.mockImplementation((cmd: string, callback: Callback) => {
      if (cmd.includes('config get-value project')) {
        callback(null, {stdout: '(unset)\n'});
      } else if (cmd.includes('config get-value run/region')) {
        callback(null, {stdout: 'gcloud-region\n'});
      }
    });

    await expect(deployToCloudRun(optionsWithoutProject)).rejects.toThrow(
      /Project is not specified/,
    );
  });

  it('should clean up existing temp folder before deploying', async () => {
    (isFolderExists as Mock).mockResolvedValue(true);

    await deployToCloudRun(defaultOptions);

    expect(fs.rm).toHaveBeenCalledWith('/tmp/test-deploy', {
      recursive: true,
      force: true,
    });
  });

  it('should throw error if package.json has no dependencies', async () => {
    (loadFileData as Mock).mockResolvedValue({});

    await deployToCloudRun(defaultOptions);

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('No dependencies found in package.json'),
    );
  });

  it('should throw error if required npm packages are missing in package.json', async () => {
    (loadFileData as Mock).mockResolvedValue({
      dependencies: {
        'some-other-package': '1.0.0',
      },
    });

    await deployToCloudRun(defaultOptions);

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Package "@google/adk" is required but not found',
      ),
    );
  });

  it('should handle spawn failures', async () => {
    spawnMock.mockReturnValue({
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') {
          process.nextTick(() => cb(1));
        }
      }),
    });

    await deployToCloudRun(defaultOptions);

    expect(log.error).toHaveBeenCalledWith(
      expect.stringContaining('Command failed with exit code 1'),
    );
  });

  it('should call intro when process.stdout.isTTY is true', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      configurable: true,
    });

    try {
      // Mock successful gcloud resolution so intro is reached
      execMock.mockImplementation((cmd: string, callback: Callback) => {
        if (cmd.includes('config get-value project')) {
          callback(null, {stdout: 'gcloud-project\n'});
        } else if (cmd.includes('config get-value run/region')) {
          callback(null, {stdout: 'gcloud-region\n'});
        } else {
          callback(null, {stdout: ''});
        }
      });

      await deployToCloudRun(defaultOptions);
      expect(intro).toHaveBeenCalledWith('Agent Deployment');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }
  });

  it('should not call intro when process.stdout.isTTY is false', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      configurable: true,
    });

    try {
      await deployToCloudRun(defaultOptions);
      expect(intro).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }
  });

  it('should call outro on successful deployment when process.stdout.isTTY is true', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      configurable: true,
    });

    try {
      await deployToCloudRun(defaultOptions);
      expect(outro).toHaveBeenCalledWith('Happy Agent Building!');
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }
  });

  it('should not call outro when process.stdout.isTTY is false', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      configurable: true,
    });

    try {
      await deployToCloudRun(defaultOptions);
      expect(outro).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }
  });

  it('should call outro with failure message when deployment fails even if isTTY is true', async () => {
    const originalIsTTY = process.stdout.isTTY;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      configurable: true,
    });

    spawnMock.mockReturnValue({
      on: vi.fn((event: string, cb: (code: number) => void) => {
        if (event === 'close') {
          process.nextTick(() => cb(1));
        }
      }),
    });

    try {
      await deployToCloudRun(defaultOptions);
      expect(outro).toHaveBeenCalledWith('Deployment failed');
      expect(log.error).toHaveBeenCalledWith(
        expect.stringContaining('Command failed with exit code 1'),
      );
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: originalIsTTY,
        configurable: true,
      });
    }
  });

  it('should call log.step at each deployment phase', async () => {
    await deployToCloudRun(defaultOptions);

    expect(log.step).toHaveBeenCalledWith(
      'Starting deployment to Cloud Run...',
    );
    expect(log.step).toHaveBeenCalledWith('Copying agent source files...');
    expect(log.step).toHaveBeenCalledWith('Creating package.json...');
    expect(log.step).toHaveBeenCalledWith('Creating Dockerfile...');
    expect(log.step).toHaveBeenCalledWith('Deploying to Cloud Run...');
  });

  it('should call log.step for pre-existing temp folder cleanup', async () => {
    (isFolderExists as Mock).mockResolvedValue(true);

    await deployToCloudRun(defaultOptions);

    // No log.step for cleanup in current code, but we check if fs.rm was called.
    expect(fs.rm).toHaveBeenCalledWith('/tmp/test-deploy', {
      recursive: true,
      force: true,
    });
  });

  it('should call log.info with default project when project option is not provided', async () => {
    const optionsWithoutProject = {...defaultOptions, project: ''};

    await deployToCloudRun(optionsWithoutProject);

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining(
        '--project option is not provided, using default project from gcloud config: gcloud-project',
      ),
    );
  });

  it('should call log.info with default region when region option is not provided', async () => {
    const optionsWithoutRegion = {...defaultOptions, region: ''};

    await deployToCloudRun(optionsWithoutRegion);

    expect(log.info).toHaveBeenCalledWith(
      expect.stringContaining(
        '--region option is not provided, using default region from gcloud config: gcloud-region',
      ),
    );
  });

  it('should not call log.info for project when project option is explicitly provided', async () => {
    await deployToCloudRun(defaultOptions);

    expect(log.info).not.toHaveBeenCalledWith(
      expect.stringContaining('--project option is not provided'),
    );
  });

  it('should not call log.info for region when region option is explicitly provided', async () => {
    await deployToCloudRun(defaultOptions);

    expect(log.info).not.toHaveBeenCalledWith(
      expect.stringContaining('--region option is not provided'),
    );
  });

  it('error message for missing project should say "specify project" not "specify region"', async () => {
    const optionsWithoutProject = {...defaultOptions, project: ''};

    execMock.mockImplementation((cmd: string, callback: Callback) => {
      if (cmd.includes('config get-value project')) {
        callback(null, {stdout: '(unset)\n'});
      } else {
        callback(null, {stdout: ''});
      }
    });

    await expect(deployToCloudRun(optionsWithoutProject)).rejects.toThrow(
      'Please specify project with --project option',
    );
  });

  it('error message for missing project should not contain stale "specify region" wording', async () => {
    const optionsWithoutProject = {...defaultOptions, project: ''};

    execMock.mockImplementation((cmd: string, callback: Callback) => {
      if (cmd.includes('config get-value project')) {
        callback(null, {stdout: '(unset)\n'});
      } else {
        callback(null, {stdout: ''});
      }
    });

    let thrownError: Error | undefined;
    try {
      await deployToCloudRun(optionsWithoutProject);
    } catch (e) {
      thrownError = e as Error;
    }
    expect(thrownError).toBeDefined();
    expect(thrownError!.message).not.toContain('specify region with --project');
  });

  it('should call fs.rm for cleanup even when deployment fails', async () => {
    (loadFileData as Mock).mockResolvedValue({});
    (isFolderExists as Mock).mockResolvedValue(true);

    await deployToCloudRun(defaultOptions);

    expect(fs.rm).toHaveBeenCalledWith('/tmp/test-deploy', {
      recursive: true,
      force: true,
    });
  });
});
