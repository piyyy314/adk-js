/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {confirm, isCancel, password, select, text} from '@clack/prompts';
import {execSync} from 'node:child_process';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  Mock,
  vi,
} from 'vitest';
import {createAgent} from '../../src/cli/cli_create.js';
import {
  createFolder,
  isFolderExists,
  listFiles,
  removeFolder,
  saveToFile,
} from '../../src/utils/file_utils.js';

// Mock dependencies
vi.mock('@clack/prompts', () => ({
  confirm: vi.fn(),
  intro: vi.fn(),
  isCancel: vi.fn(),
  password: vi.fn(),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
  },
  note: vi.fn(),
  outro: vi.fn(),
  select: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  text: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  exec: vi.fn((cmd, opts, callback) => {
    if (callback) callback(null, 'stdout', 'stderr');
    return {
      on: (event: string, cb: () => void) => {
        if (event === 'exit') cb();
      },
    };
  }),
  execSync: vi.fn(),
}));

vi.mock('../../src/utils/file_utils.js', () => ({
  createFolder: vi.fn(),
  isFolderExists: vi.fn(),
  listFiles: vi.fn(),
  removeFolder: vi.fn(),
  saveToFile: vi.fn(),
}));

describe('createAgent', () => {
  const getFreshOptions = () => ({
    agentName: 'test-agent',
    forceYes: false,
    model: '',
    apiKey: '',
    project: '',
    region: '',
    language: '',
  });

  beforeAll(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (isCancel as unknown as Mock).mockReturnValue(false);
    (listFiles as Mock).mockResolvedValue(['file1', 'file2']);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Non-interactive Mode (forceYes: true)', () => {
    it('should create agent with default values when minimal args provided', async () => {
      const {intro, note, outro, spinner, log} = await import('@clack/prompts');
      await createAgent({...getFreshOptions(), forceYes: true});

      expect(intro).not.toHaveBeenCalled();
      expect(note).not.toHaveBeenCalled();
      expect(outro).not.toHaveBeenCalled();
      expect(spinner).not.toHaveBeenCalled();
      expect(log.step).not.toHaveBeenCalled();
      expect(isFolderExists).toHaveBeenCalled();
      expect(createFolder).toHaveBeenCalled();

      // Verify defaults
      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('agent.ts'),
        expect.stringContaining("model: 'gemini-2.5-flash'"),
      );
      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('"main": "agent.ts"'),
      );
    });

    it('should use provided model and language', async () => {
      await createAgent({
        ...getFreshOptions(),
        forceYes: true,
        model: 'gemini-pro',
        language: 'js',
      });

      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('agent.js'),
        expect.stringContaining("model: 'gemini-pro'"),
      );
      expect(saveToFile).not.toHaveBeenCalledWith(
        expect.stringContaining('tsconfig.json'),
        expect.anything(),
      );
    });

    it('should set Vertex AI env vars if project/region provided', async () => {
      await createAgent({
        ...getFreshOptions(),
        forceYes: true,
        project: 'my-project',
        region: 'us-central1',
      });

      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('.env'),
        expect.stringContaining('GOOGLE_CLOUD_PROJECT=my-project'),
      );
      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('.env'),
        expect.stringContaining('GOOGLE_GENAI_USE_VERTEXAI=1'),
      );
    });

    it('should set Google AI env vars if api key provided', async () => {
      await createAgent({
        ...getFreshOptions(),
        forceYes: true,
        apiKey: 'my-api-key',
      });

      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('.env'),
        expect.stringContaining('GOOGLE_API_KEY=my-api-key'),
      );
    });
  });

  describe('Interactive Mode', () => {
    it('should prompt for model if not provided', async () => {
      (select as Mock).mockResolvedValueOnce('gemini-2.5-pro'); // Model
      (select as Mock).mockResolvedValueOnce('ts'); // Language
      (select as Mock).mockResolvedValueOnce('googleai'); // Backend
      (password as Mock).mockResolvedValueOnce('test-key'); // API Key

      await createAgent(getFreshOptions());

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose a model for the root agent',
        }),
      );
      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('agent.ts'),
        expect.stringContaining("model: 'gemini-2.5-pro'"),
      );
    });

    it('should pass correct initial values to select prompts', async () => {
      (select as Mock).mockResolvedValue('gemini-2.5-flash');
      (password as Mock).mockResolvedValue('test-key');

      await createAgent(getFreshOptions());

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose a model for the root agent',
          initialValue: 'gemini-2.5-flash',
        }),
      );
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose a language for the agent',
          initialValue: 'ts',
        }),
      );
      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose a backend',
          initialValue: 'googleai',
        }),
      );
    });

    it('should return without creating files if model selection is cancelled', async () => {
      (select as Mock).mockResolvedValueOnce('cancel-symbol');
      (isCancel as unknown as Mock).mockReturnValue(true);

      await expect(createAgent(getFreshOptions())).resolves.toBeUndefined();
      expect(saveToFile).not.toHaveBeenCalled();
    });

    it('should prompt for language if not provided', async () => {
      (select as Mock).mockResolvedValueOnce('gemini-2.5-flash');
      (select as Mock).mockResolvedValueOnce('js');
      (select as Mock).mockResolvedValueOnce('googleai');
      (password as Mock).mockResolvedValueOnce('test-key');

      await createAgent(getFreshOptions());

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose a language for the agent',
          options: expect.arrayContaining([
            expect.objectContaining({label: 'JavaScript', value: 'js'}),
          ]),
        }),
      );
      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('agent.js'),
        expect.anything(),
      );
    });

    it('should handle Vertex AI selection with gcloud defaults', async () => {
      (select as Mock).mockResolvedValueOnce('gemini-2.5-flash');
      (select as Mock).mockResolvedValueOnce('ts');
      (select as Mock).mockResolvedValueOnce('vertex'); // Backend

      (execSync as Mock).mockImplementation((cmd: string) => {
        if (cmd.includes('project')) return 'gcloud-project\n';
        if (cmd.includes('region')) return 'gcloud-region\n';
        return '';
      });

      (text as Mock).mockResolvedValueOnce('gcloud-project');
      (text as Mock).mockResolvedValueOnce('gcloud-region');

      await createAgent(getFreshOptions());

      expect(text).toHaveBeenCalledWith(
        expect.objectContaining({
          initialValue: 'gcloud-project',
        }),
      );
      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('.env'),
        expect.stringContaining('GOOGLE_CLOUD_PROJECT=gcloud-project'),
      );
    });
  });

  describe('Folder Handling', () => {
    it('should ask to overwrite if folder exists', async () => {
      (isFolderExists as Mock).mockResolvedValue(true);
      (confirm as unknown as Mock).mockResolvedValueOnce(true); // Overwrite = Yes

      // Follow up choices since we continue
      (select as Mock).mockResolvedValue('gemini-2.5-flash');
      (select as Mock).mockResolvedValue('ts');
      (select as Mock).mockResolvedValue('googleai');
      (password as Mock).mockResolvedValue('key');

      await createAgent(getFreshOptions());

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('already exists'),
        }),
      );
      expect(removeFolder).toHaveBeenCalled();
    });

    it('should return without modifying files and call outro when user declines overwrite', async () => {
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        configurable: true,
      });

      try {
        const {outro} = await import('@clack/prompts');
        (isFolderExists as Mock).mockResolvedValue(true);
        (confirm as unknown as Mock).mockResolvedValueOnce(false); // Overwrite = No

        await expect(createAgent(getFreshOptions())).resolves.toBeUndefined();
        expect(removeFolder).not.toHaveBeenCalled();
        expect(outro).toHaveBeenCalledWith('Agent creation failed');
      } finally {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalIsTTY,
          configurable: true,
        });
      }
    });

    it('should not call outro when user declines overwrite and isTTY is false', async () => {
      const originalIsTTY = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });

      try {
        const {outro} = await import('@clack/prompts');
        (isFolderExists as Mock).mockResolvedValue(true);
        (confirm as unknown as Mock).mockResolvedValueOnce(false); // Overwrite = No

        await expect(createAgent(getFreshOptions())).resolves.toBeUndefined();
        expect(removeFolder).not.toHaveBeenCalled();
        expect(outro).not.toHaveBeenCalled();
      } finally {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: originalIsTTY,
          configurable: true,
        });
      }
    });

    it('should return without modifying files if overwrite confirm is cancelled', async () => {
      (isFolderExists as Mock).mockResolvedValue(true);
      const cancelSymbol = Symbol('cancel');
      (confirm as unknown as Mock).mockResolvedValueOnce(cancelSymbol);
      (isCancel as unknown as Mock).mockReturnValueOnce(true);

      await expect(createAgent(getFreshOptions())).resolves.toBeUndefined();
      expect(removeFolder).not.toHaveBeenCalled();
      expect(createFolder).not.toHaveBeenCalledTimes(2);
    });
  });

  describe('spinner behavior during dependency installation', () => {
    it('should start and stop spinner during successful npm install when not forceYes', async () => {
      const mockSpinnerInstance = {start: vi.fn(), stop: vi.fn()};
      const {spinner: spinnerMock} = await import('@clack/prompts');
      (spinnerMock as Mock).mockReturnValue(mockSpinnerInstance);

      await createAgent({...getFreshOptions(), forceYes: false});

      expect(mockSpinnerInstance.start).toHaveBeenCalledWith(
        'Installing dependencies...',
      );
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(
        'Dependencies installed successfully.',
      );
    });

    it('should NOT start spinner during npm install when forceYes is true', async () => {
      const mockSpinnerInstance = {start: vi.fn(), stop: vi.fn()};
      const {spinner: spinnerMock, intro} = await import('@clack/prompts');
      (spinnerMock as Mock).mockReturnValue(mockSpinnerInstance);

      await createAgent({...getFreshOptions(), forceYes: true});

      expect(spinnerMock).not.toHaveBeenCalled();
      expect(intro).not.toHaveBeenCalled();
    });

    it('should stop spinner with error message and call outro and return early when npm install fails and not forceYes', async () => {
      const mockSpinnerInstance = {start: vi.fn(), stop: vi.fn()};
      const {
        spinner: spinnerMock,
        note,
        outro,
      } = await import('@clack/prompts');
      (spinnerMock as Mock).mockReturnValue(mockSpinnerInstance);

      const {exec: execMock} = await import('node:child_process');
      // Make exec fail by calling callback with error
      (execMock as unknown as Mock).mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (err: Error | null) => void,
        ) => {
          callback(new Error('npm install failed'));
          return {on: vi.fn()};
        },
      );

      await createAgent({...getFreshOptions(), forceYes: false});

      expect(mockSpinnerInstance.start).toHaveBeenCalledWith(
        'Installing dependencies...',
      );
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(
        'Failed to install dependencies.',
        1,
      );
      expect(outro).toHaveBeenCalledWith('Agent creation failed');
      expect(note).not.toHaveBeenCalled();
    });

    it('should stop early without calling outro, log.error or listFiles when npm install fails and forceYes is true', async () => {
      const mockSpinnerInstance = {start: vi.fn(), stop: vi.fn()};
      const {
        spinner: spinnerMock,
        note,
        outro,
        log,
      } = await import('@clack/prompts');
      (spinnerMock as Mock).mockReturnValue(mockSpinnerInstance);

      const {exec: execMock} = await import('node:child_process');
      // Make exec fail by calling callback with error
      (execMock as unknown as Mock).mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (err: Error | null) => void,
        ) => {
          callback(new Error('npm install failed'));
          return {on: vi.fn()};
        },
      );

      await expect(
        createAgent({...getFreshOptions(), forceYes: true}),
      ).resolves.toBeUndefined();

      // Spinner is never created when forceYes is true, so no spinner calls.
      expect(spinnerMock).not.toHaveBeenCalled();
      // The error is only logged/announced in the interactive (!forceYes) path.
      expect(log.error).not.toHaveBeenCalled();
      expect(outro).not.toHaveBeenCalled();
      expect(note).not.toHaveBeenCalled();
      // The function must return before reaching the file-listing/note step.
      expect(listFiles).not.toHaveBeenCalled();
    });
  });

  describe('Package Manager Detection', () => {
    const originalUserAgent = process.env.npm_config_user_agent;

    afterEach(() => {
      if (originalUserAgent !== undefined) {
        process.env.npm_config_user_agent = originalUserAgent;
      } else {
        delete process.env.npm_config_user_agent;
      }
    });

    it('should use pnpm install commands and instructions when running under pnpm', async () => {
      process.env.npm_config_user_agent = 'pnpm/10.30.3';
      const {exec: execMock} = await import('node:child_process');
      const {note} = await import('@clack/prompts');

      await createAgent({
        ...getFreshOptions(),
        forceYes: true,
        language: 'ts',
      });

      expect(execMock).toHaveBeenCalledWith(
        'pnpm add -D typescript',
        expect.anything(),
        expect.any(Function),
      );
      expect(execMock).toHaveBeenCalledWith(
        'pnpm add @google/adk @google/adk-devtools zod dotenv',
        expect.anything(),
        expect.any(Function),
      );

      await createAgent({
        ...getFreshOptions(),
        forceYes: false,
        language: 'ts',
      });
      expect(note).toHaveBeenCalledWith(
        expect.stringContaining('pnpm web'),
        expect.anything(),
      );
    });

    it('should use yarn install commands and instructions when running under yarn', async () => {
      process.env.npm_config_user_agent = 'yarn/1.22.19';
      const {exec: execMock} = await import('node:child_process');
      const {note} = await import('@clack/prompts');

      await createAgent({
        ...getFreshOptions(),
        forceYes: true,
        language: 'ts',
      });

      expect(execMock).toHaveBeenCalledWith(
        'yarn add -D typescript',
        expect.anything(),
        expect.any(Function),
      );
      expect(execMock).toHaveBeenCalledWith(
        'yarn add @google/adk @google/adk-devtools zod dotenv',
        expect.anything(),
        expect.any(Function),
      );

      await createAgent({
        ...getFreshOptions(),
        forceYes: false,
        language: 'ts',
      });
      expect(note).toHaveBeenCalledWith(
        expect.stringContaining('yarn web'),
        expect.anything(),
      );
    });
  });
});
