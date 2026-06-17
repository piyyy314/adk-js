/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {confirm, intro, isCancel, note, outro, password, select, text} from '@clack/prompts';
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

// Helper to set process.stdout.isTTY for a block of tests
function setTTY(value: boolean) {
  Object.defineProperty(process.stdout, 'isTTY', {
    value,
    configurable: true,
    writable: true,
  });
}

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
      await createAgent({...getFreshOptions(), forceYes: true});

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

    it('should use pnpm for installation and scripts', async () => {
      await createAgent({...getFreshOptions(), forceYes: true});

      expect(saveToFile).toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('pnpm dlx'),
      );
      // We check that npx is NOT used in the template
      expect(saveToFile).not.toHaveBeenCalledWith(
        expect.stringContaining('package.json'),
        expect.stringContaining('npx'),
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

    it('should return without modifying files if user declines overwrite', async () => {
      (isFolderExists as Mock).mockResolvedValue(true);
      (confirm as unknown as Mock).mockResolvedValueOnce(false); // Overwrite = No

      await expect(createAgent(getFreshOptions())).resolves.toBeUndefined();
      expect(removeFolder).not.toHaveBeenCalled();
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

  describe('TTY-aware intro and outro', () => {
    afterEach(() => {
      // Restore isTTY to default (undefined / non-TTY) after each test in this suite
      setTTY(false);
    });

    it('should call intro and outro when process.stdout.isTTY is true', async () => {
      setTTY(true);
      const {intro: introMock, outro: outroMock} = await import(
        '@clack/prompts'
      );

      await createAgent({...getFreshOptions(), forceYes: true});

      expect(introMock).toHaveBeenCalledWith('Agent Creation');
      expect(outroMock).toHaveBeenCalledWith('Happy Agent Building!');
    });

    it('should NOT call intro when process.stdout.isTTY is false', async () => {
      setTTY(false);
      const {intro: introMock} = await import('@clack/prompts');

      await createAgent({...getFreshOptions(), forceYes: true});

      expect(introMock).not.toHaveBeenCalled();
    });

    it('should NOT call outro when process.stdout.isTTY is false', async () => {
      setTTY(false);
      const {outro: outroMock} = await import('@clack/prompts');

      await createAgent({...getFreshOptions(), forceYes: true});

      expect(outroMock).not.toHaveBeenCalled();
    });
  });

  describe('select option hints', () => {
    it('should include hint for each model option in interactive mode', async () => {
      (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // Model
      (select as Mock).mockResolvedValueOnce('ts'); // Language
      (select as Mock).mockResolvedValueOnce('googleai'); // Backend
      (password as Mock).mockResolvedValueOnce('api-key');

      await createAgent(getFreshOptions());

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose a model for the root agent',
          options: expect.arrayContaining([
            expect.objectContaining({
              label: 'gemini-2.5-flash',
              value: 'gemini-2.5-flash',
              hint: 'Fast and cost-effective',
            }),
            expect.objectContaining({
              label: 'gemini-2.5-pro',
              value: 'gemini-2.5-pro',
              hint: 'Best for complex reasoning',
            }),
            expect.objectContaining({
              label: 'gemini-3-flash-preview',
              value: 'gemini-3-flash-preview',
              hint: 'Next-gen speed (Preview)',
            }),
            expect.objectContaining({
              label: 'gemini-3-pro-preview',
              value: 'gemini-3-pro-preview',
              hint: 'Next-gen intelligence (Preview)',
            }),
          ]),
        }),
      );
    });

    it('should include hint for each language option in interactive mode', async () => {
      (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // Model
      (select as Mock).mockResolvedValueOnce('ts'); // Language
      (select as Mock).mockResolvedValueOnce('googleai'); // Backend
      (password as Mock).mockResolvedValueOnce('api-key');

      await createAgent(getFreshOptions());

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose a language for the agent',
          options: expect.arrayContaining([
            expect.objectContaining({
              label: 'TypeScript',
              value: 'ts',
              hint: 'Type-safe (recommended)',
            }),
            expect.objectContaining({
              label: 'JavaScript',
              value: 'js',
              hint: 'Simple and standard',
            }),
          ]),
        }),
      );
    });

    it('should include hint for each backend option in interactive mode', async () => {
      (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // Model
      (select as Mock).mockResolvedValueOnce('ts'); // Language
      (select as Mock).mockResolvedValueOnce('googleai'); // Backend
      (password as Mock).mockResolvedValueOnce('api-key');

      await createAgent(getFreshOptions());

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Choose a backend',
          options: expect.arrayContaining([
            expect.objectContaining({
              label: 'Google AI',
              value: 'googleai',
              hint: 'Quick start with API key',
            }),
            expect.objectContaining({
              label: 'Vertex AI',
              value: 'vertex',
              hint: 'Enterprise-ready GCP platform',
            }),
          ]),
        }),
      );
    });
  });

  describe('note message content', () => {
    it('should include both pnpm run web and pnpm run cli in the success note', async () => {
      await createAgent({...getFreshOptions(), forceYes: true});

      expect(note).toHaveBeenCalledWith(
        expect.stringContaining('pnpm run web'),
        expect.anything(),
      );
      expect(note).toHaveBeenCalledWith(
        expect.stringContaining('pnpm run cli'),
        expect.anything(),
      );
    });

    it('should NOT reference npm run in the success note', async () => {
      await createAgent({...getFreshOptions(), forceYes: true});

      const noteCalls = (note as Mock).mock.calls;
      for (const call of noteCalls) {
        expect(call[0]).not.toContain('npm run');
      }
    });

    it('should include the agent name in the pnpm run web command hint', async () => {
      await createAgent({...getFreshOptions(), forceYes: true});

      expect(note).toHaveBeenCalledWith(
        expect.stringContaining(`cd test-agent`),
        expect.anything(),
      );
    });
  });

  describe('spinner behavior during dependency installation', () => {
    it('should start and stop spinner during successful pnpm install', async () => {
      const mockSpinnerInstance = {start: vi.fn(), stop: vi.fn()};
      // The spinner mock is already set up in the module mock, but we override for this test
      const {spinner: spinnerMock} = await import('@clack/prompts');
      (spinnerMock as Mock).mockReturnValue(mockSpinnerInstance);

      await createAgent({...getFreshOptions(), forceYes: true});

      expect(mockSpinnerInstance.start).toHaveBeenCalledWith(
        'Installing dependencies...',
      );
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(
        'Dependencies installed successfully.',
      );
    });

    it('should stop spinner with error message when pnpm install fails', async () => {
      const mockSpinnerInstance = {start: vi.fn(), stop: vi.fn()};
      const {spinner: spinnerMock} = await import('@clack/prompts');
      (spinnerMock as Mock).mockReturnValue(mockSpinnerInstance);

      const {exec: execMock} = await import('node:child_process');
      // Make exec fail by calling callback with error
      (execMock as unknown as Mock).mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (err: Error | null) => void,
        ) => {
          callback(new Error('pnpm install failed'));
          return {on: vi.fn()};
        },
      );

      await createAgent({...getFreshOptions(), forceYes: true});

      expect(mockSpinnerInstance.start).toHaveBeenCalledWith(
        'Installing dependencies...',
      );
      expect(mockSpinnerInstance.stop).toHaveBeenCalledWith(
        'Failed to install dependencies.',
        1,
      );
    });
  });
});
