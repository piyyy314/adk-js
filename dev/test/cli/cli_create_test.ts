/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  confirm,
  isCancel,
  outro,
  password,
  select,
  text,
} from '@clack/prompts';
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

    it('should stop spinner with error message when npm install fails and not forceYes', async () => {
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
    });
  });

  describe('handleCancellation (Operation cancelled outro)', () => {
    const withTTY = async (value: boolean, fn: () => Promise<void>) => {
      const original = process.stdout.isTTY;
      Object.defineProperty(process.stdout, 'isTTY', {
        value,
        configurable: true,
      });
      try {
        await fn();
      } finally {
        Object.defineProperty(process.stdout, 'isTTY', {
          value: original,
          configurable: true,
        });
      }
    };

    it('should call outro with "Operation cancelled" when model selection is cancelled and stdout is TTY', async () => {
      await withTTY(true, async () => {
        (select as Mock).mockResolvedValueOnce(Symbol('cancel'));
        (isCancel as unknown as Mock).mockReturnValueOnce(true);

        await createAgent(getFreshOptions());

        expect(outro).toHaveBeenCalledWith('Operation cancelled');
      });
    });

    it('should NOT call outro when model selection is cancelled and stdout is not TTY', async () => {
      await withTTY(false, async () => {
        (select as Mock).mockResolvedValueOnce(Symbol('cancel'));
        (isCancel as unknown as Mock).mockReturnValueOnce(true);

        await createAgent(getFreshOptions());

        expect(outro).not.toHaveBeenCalled();
      });
    });

    it('should call outro with "Operation cancelled" when folder overwrite confirm is cancelled and stdout is TTY', async () => {
      await withTTY(true, async () => {
        (isFolderExists as Mock).mockResolvedValue(true);
        (confirm as unknown as Mock).mockResolvedValueOnce(Symbol('cancel'));
        (isCancel as unknown as Mock).mockReturnValueOnce(true);

        await createAgent(getFreshOptions());

        expect(outro).toHaveBeenCalledWith('Operation cancelled');
        expect(removeFolder).not.toHaveBeenCalled();
      });
    });

    it('should call outro with "Operation cancelled" when language selection is cancelled', async () => {
      await withTTY(true, async () => {
        (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // model
        (select as Mock).mockResolvedValueOnce(Symbol('cancel')); // language
        (isCancel as unknown as Mock)
          .mockReturnValueOnce(false) // model
          .mockReturnValueOnce(true); // language

        await createAgent(getFreshOptions());

        expect(outro).toHaveBeenCalledWith('Operation cancelled');
        expect(saveToFile).not.toHaveBeenCalled();
      });
    });

    it('should call outro with "Operation cancelled" when backend selection is cancelled', async () => {
      await withTTY(true, async () => {
        (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // model
        (select as Mock).mockResolvedValueOnce('ts'); // language
        (select as Mock).mockResolvedValueOnce(Symbol('cancel')); // backend
        (isCancel as unknown as Mock)
          .mockReturnValueOnce(false) // model
          .mockReturnValueOnce(false) // language
          .mockReturnValueOnce(true); // backend

        await createAgent(getFreshOptions());

        expect(outro).toHaveBeenCalledWith('Operation cancelled');
        expect(saveToFile).not.toHaveBeenCalled();
      });
    });

    it('should call outro with "Operation cancelled" when vertex project prompt is cancelled', async () => {
      await withTTY(true, async () => {
        (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // model
        (select as Mock).mockResolvedValueOnce('ts'); // language
        (select as Mock).mockResolvedValueOnce('vertex'); // backend
        (text as Mock).mockResolvedValueOnce(Symbol('cancel')); // project
        (isCancel as unknown as Mock)
          .mockReturnValueOnce(false) // model
          .mockReturnValueOnce(false) // language
          .mockReturnValueOnce(false) // backend
          .mockReturnValueOnce(true); // project

        await createAgent(getFreshOptions());

        expect(outro).toHaveBeenCalledWith('Operation cancelled');
        expect(saveToFile).not.toHaveBeenCalled();
      });
    });

    it('should call outro with "Operation cancelled" when vertex region prompt is cancelled', async () => {
      await withTTY(true, async () => {
        (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // model
        (select as Mock).mockResolvedValueOnce('ts'); // language
        (select as Mock).mockResolvedValueOnce('vertex'); // backend
        (text as Mock).mockResolvedValueOnce('my-project'); // project
        (text as Mock).mockResolvedValueOnce(Symbol('cancel')); // region
        (isCancel as unknown as Mock)
          .mockReturnValueOnce(false) // model
          .mockReturnValueOnce(false) // language
          .mockReturnValueOnce(false) // backend
          .mockReturnValueOnce(false) // project
          .mockReturnValueOnce(true); // region

        await createAgent(getFreshOptions());

        expect(outro).toHaveBeenCalledWith('Operation cancelled');
        expect(saveToFile).not.toHaveBeenCalled();
      });
    });

    it('should call outro with "Operation cancelled" when API key prompt is cancelled', async () => {
      await withTTY(true, async () => {
        (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // model
        (select as Mock).mockResolvedValueOnce('ts'); // language
        (select as Mock).mockResolvedValueOnce('googleai'); // backend
        (password as Mock).mockResolvedValueOnce(Symbol('cancel')); // apiKey
        (isCancel as unknown as Mock)
          .mockReturnValueOnce(false) // model
          .mockReturnValueOnce(false) // language
          .mockReturnValueOnce(false) // backend
          .mockReturnValueOnce(true); // apiKey

        await createAgent(getFreshOptions());

        expect(outro).toHaveBeenCalledWith('Operation cancelled');
        expect(saveToFile).not.toHaveBeenCalled();
      });
    });
  });

  describe('Google API Key hint message', () => {
    it('should log info about aistudio.google.com before prompting for API key when not forceYes', async () => {
      const {log} = await import('@clack/prompts');
      (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // model
      (select as Mock).mockResolvedValueOnce('ts'); // language
      (select as Mock).mockResolvedValueOnce('googleai'); // backend
      (password as Mock).mockResolvedValueOnce('test-key');

      await createAgent(getFreshOptions());

      expect(log.info).toHaveBeenCalledWith(
        expect.stringContaining('https://aistudio.google.com/'),
      );
    });

    it('should NOT log info about aistudio.google.com when forceYes is true', async () => {
      const {log} = await import('@clack/prompts');

      await createAgent({...getFreshOptions(), forceYes: true});

      expect(log.info).not.toHaveBeenCalledWith(
        expect.stringContaining('aistudio.google.com'),
      );
    });

    it('should NOT log the API key hint when the vertex backend is selected', async () => {
      const {log} = await import('@clack/prompts');
      (select as Mock).mockResolvedValueOnce('gemini-2.5-flash'); // model
      (select as Mock).mockResolvedValueOnce('ts'); // language
      (select as Mock).mockResolvedValueOnce('vertex'); // backend
      (text as Mock).mockResolvedValueOnce('my-project'); // project
      (text as Mock).mockResolvedValueOnce('us-central1'); // region

      await createAgent(getFreshOptions());

      expect(log.info).not.toHaveBeenCalledWith(
        expect.stringContaining('aistudio.google.com'),
      );
    });
  });
});
