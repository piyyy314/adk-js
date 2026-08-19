/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {intro, isCancel, outro, spinner, text} from '@clack/prompts';
import {BaseAgent, BaseSessionService, Runner} from '@google/adk';
import {createInterface} from 'node:readline';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import {runAgent} from '../../src/cli/cli_run.js';
import {AgentFile} from '../../src/utils/agent_loader.js';
import {loadFileData, saveToFile} from '../../src/utils/file_utils.js';

// Mock dependencies
vi.mock('../../src/utils/agent_loader.js', () => ({
  AgentFile: vi.fn(),
}));

vi.mock('../../src/utils/file_utils.js', () => ({
  loadFileData: vi.fn(),
  saveToFile: vi.fn(),
}));

vi.mock('@google/adk', () => {
  return {
    Runner: vi.fn().mockImplementation(() => ({
      runAsync: vi.fn().mockImplementation(async function* () {
        yield {
          author: 'model',
          content: {parts: [{text: 'Response from model'}]},
        };
      }),
    })),
    InMemoryArtifactService: vi.fn(),
    InMemorySessionService: vi.fn().mockImplementation(() => ({
      createSession: vi.fn().mockResolvedValue({
        id: 'session-123',
        appName: 'test-agent',
        userId: 'test_user',
        events: [],
      }),
      appendEvent: vi.fn(),
      getSession: vi.fn().mockResolvedValue({
        id: 'session-123',
        appName: 'test-agent',
        userId: 'test_user',
        events: [],
      }),
    })),
    InMemoryMemoryService: vi.fn(),
  };
});

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  log: {
    error: vi.fn(),
    info: vi.fn(),
    step: vi.fn(),
    warn: vi.fn(),
  },
  text: vi.fn(),
  isCancel: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

vi.mock('node:readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    [Symbol.asyncIterator]: vi.fn().mockReturnValue({
      next: vi.fn(),
    }),
  }),
}));

describe('cli_run', () => {
  let mockAgentFile: AgentFile;
  let mockRootAgent: BaseAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Force TTY path so unit tests use the mocked `text()` from @clack/prompts.
    (process.stdin as unknown as {isTTY: boolean}).isTTY = true;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: true,
      configurable: true,
    });

    mockRootAgent = {
      name: 'test-agent',
    } as unknown as BaseAgent;

    mockAgentFile = {
      load: vi.fn().mockResolvedValue(mockRootAgent),
      [Symbol.asyncDispose]: vi.fn(),
    } as unknown as AgentFile;

    (AgentFile as unknown as Mock).mockImplementation(() => mockAgentFile);

    // Restore Runner mock implementation that vi.restoreAllMocks() may have cleared.
    (Runner as unknown as Mock).mockImplementation(() => ({
      runAsync: vi.fn().mockImplementation(async function* () {
        yield {
          author: 'model',
          content: {parts: [{text: 'Response from model'}]},
        };
      }),
    }));

    (text as Mock).mockResolvedValue('exit');
    (isCancel as unknown as Mock).mockReturnValue(false);
  });

  afterEach(() => {
    (process.stdin as unknown as {isTTY: boolean | undefined}).isTTY =
      undefined;
    vi.restoreAllMocks();
  });

  it('should run interactively by default', async () => {
    await runAgent({agentPath: 'agent.ts'});

    expect(AgentFile).toHaveBeenCalledWith(
      expect.stringContaining('agent.ts'),
      undefined,
    );
    expect(mockAgentFile.load).toHaveBeenCalled();
    expect(intro).toHaveBeenCalledWith('Running agent: test-agent');
    expect(text).toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith('Happy Agent Building!');
  });

  const createMockSessionService = () =>
    ({
      createSession: vi.fn().mockResolvedValue({
        id: 'session-123',
        appName: 'test-agent',
        userId: 'test_user',
        events: [],
      }),
      appendEvent: vi.fn(),
      getSession: vi.fn().mockResolvedValue({
        id: 'session-123',
        appName: 'test-agent',
        userId: 'test_user',
        events: [],
      }),
    }) as unknown as BaseSessionService;

  /**
   * Builds a fake `readline.Interface`-like object that is async-iterable
   * over the given lines, mirroring what `createInterface` normally returns.
   */
  const createMockReadlineInterface = (lines: string[]) => {
    const closeMock = vi.fn();
    let index = 0;
    const mockInterface = {
      close: closeMock,
      [Symbol.asyncIterator]() {
        return {
          next: async () => {
            if (index < lines.length) {
              return {value: lines[index++], done: false};
            }
            return {value: undefined, done: true};
          },
        };
      },
    };
    return {mockInterface, closeMock};
  };

  it('should run from input file', async () => {
    const inputFileContent = {
      state: {foo: 'bar'},
      queries: ['Hello', 'How are you?'],
    };
    (loadFileData as Mock).mockResolvedValue(inputFileContent);
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      inputFile: 'input.json',
      sessionService: mockSessionService,
    });

    expect(loadFileData).toHaveBeenCalledWith(
      expect.stringContaining('input.json'),
    );
    expect(mockSessionService.createSession).toHaveBeenCalled();
  });

  it('should handle missing input file', async () => {
    (loadFileData as Mock).mockResolvedValue(null);
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      inputFile: 'input.json',
      sessionService: mockSessionService,
    });
    expect(loadFileData).toHaveBeenCalled();
  });

  it('should run from saved session', async () => {
    const sessionContent = {
      id: 'old-session',
      appName: 'test-agent',
      userId: 'test_user',
      events: [
        {author: 'user', content: {parts: [{text: 'Hi'}]}},
        {author: 'model', content: {parts: [{text: 'Hello'}]}},
      ],
    };
    (loadFileData as Mock).mockResolvedValue(sessionContent);
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      savedSessionFile: 'session.json',
      sessionService: mockSessionService,
    });

    expect(loadFileData).toHaveBeenCalledWith('session.json');
    expect(intro).toHaveBeenCalledWith('Resuming session: test-agent');
    expect(text).toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith('Happy Agent Building!');
  });

  it('should save session when requested', async () => {
    const mockSessionService = createMockSessionService();
    // Run interactively then exit
    await runAgent({
      agentPath: 'agent.ts',
      saveSession: true,
      sessionId: 'my-session',
      sessionService: mockSessionService,
    });

    expect(saveToFile).toHaveBeenCalledWith(
      expect.stringContaining('my-session.session.json'),
      expect.anything(),
    );
  });

  it('should NOT save session if interaction is cancelled', async () => {
    const mockSessionService = createMockSessionService();
    (text as Mock).mockResolvedValueOnce(Symbol('cancel'));
    (isCancel as unknown as Mock).mockReturnValueOnce(true);

    await runAgent({
      agentPath: 'agent.ts',
      saveSession: true,
      sessionId: 'my-session',
      sessionService: mockSessionService,
    });

    expect(saveToFile).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith('Operation cancelled');
  });

  it('should prompt for session id if not provided when saving', async () => {
    (text as Mock)
      .mockResolvedValueOnce('exit') // For the runInteractively loop
      .mockResolvedValueOnce('prompted-session-id'); // For saveSession
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      saveSession: true,
      sessionService: mockSessionService,
    });

    expect(saveToFile).toHaveBeenCalledWith(
      expect.stringContaining('prompted-session-id.session.json'),
      expect.anything(),
    );
  });

  it('should not save session if session ID prompt is cancelled', async () => {
    const cancelSymbol = Symbol('cancel');
    (text as Mock)
      .mockResolvedValueOnce('exit') // For the runInteractively loop
      .mockResolvedValueOnce(cancelSymbol); // User cancels session ID prompt
    // isCancel returns false for 'exit', true for the cancel symbol
    (isCancel as unknown as Mock)
      .mockReturnValueOnce(false) // for 'exit' in runInteractively
      .mockReturnValueOnce(true); // for cancel symbol in saveSession
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      saveSession: true,
      sessionService: mockSessionService,
    });

    expect(saveToFile).not.toHaveBeenCalled();
  });

  it('should break interactive loop immediately when input is cancelled', async () => {
    const cancelSymbol = Symbol('cancel');
    (text as Mock).mockResolvedValue(cancelSymbol);
    (isCancel as unknown as Mock).mockReturnValue(true);
    const mockSessionService = createMockSessionService();

    const mockRunAsync = vi.fn().mockImplementation(async function* () {
      yield* [];
    });
    (Runner as unknown as Mock).mockImplementation(() => ({
      runAsync: mockRunAsync,
    }));

    await runAgent({
      agentPath: 'agent.ts',
      sessionService: mockSessionService,
    });

    // runAsync should not have been called because cancel breaks the loop immediately
    expect(mockRunAsync).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith('Operation cancelled');
  });

  it('should continue loop on empty input without processing', async () => {
    (text as Mock)
      .mockResolvedValueOnce('') // Empty input - should continue
      .mockResolvedValueOnce('   ') // Whitespace - should continue
      .mockResolvedValueOnce('exit'); // Exit
    (isCancel as unknown as Mock).mockReturnValue(false);
    const mockSessionService = createMockSessionService();

    const mockRunAsync = vi.fn().mockImplementation(async function* () {
      yield* [];
    });
    (Runner as unknown as Mock).mockImplementation(() => ({
      runAsync: mockRunAsync,
    }));

    await runAgent({
      agentPath: 'agent.ts',
      sessionService: mockSessionService,
    });

    // runAsync should not have been called for empty/whitespace inputs
    expect(mockRunAsync).not.toHaveBeenCalled();
  });

  it('should not call intro or outro when running from input file', async () => {
    const inputFileContent = {
      state: {foo: 'bar'},
      queries: ['Hello'],
    };
    (loadFileData as Mock).mockResolvedValue(inputFileContent);
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      inputFile: 'input.json',
      sessionService: mockSessionService,
    });

    expect(intro).not.toHaveBeenCalled();
    expect(outro).not.toHaveBeenCalled();
  });

  it('should call outro with "Run failed" when run fails and isTTY is true', async () => {
    mockAgentFile.load = vi
      .fn()
      .mockRejectedValue(new Error('Load agent failed'));
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      sessionService: mockSessionService,
    });

    expect(outro).toHaveBeenCalledWith('Run failed');
  });

  it('should still log the error message when run fails', async () => {
    const {log} = await import('@clack/prompts');
    mockAgentFile.load = vi
      .fn()
      .mockRejectedValue(new Error('Load agent failed'));
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      sessionService: mockSessionService,
    });

    expect(log.error).toHaveBeenCalledWith('Load agent failed');
  });

  it('should NOT call outro when run fails and an inputFile is provided', async () => {
    mockAgentFile.load = vi
      .fn()
      .mockRejectedValue(new Error('Load agent failed'));
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      inputFile: 'input.json',
      sessionService: mockSessionService,
    });

    expect(outro).not.toHaveBeenCalled();
  });

  it('should NOT call outro when run fails and isTTY is false', async () => {
    Object.defineProperty(process.stdout, 'isTTY', {
      value: false,
      configurable: true,
    });

    try {
      mockAgentFile.load = vi
        .fn()
        .mockRejectedValue(new Error('Load agent failed'));
      const mockSessionService = createMockSessionService();

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(outro).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        configurable: true,
      });
    }
  });

  it('should handle non-Error thrown values by logging their string representation', async () => {
    mockAgentFile.load = vi.fn().mockRejectedValue('a plain string failure');
    const mockSessionService = createMockSessionService();
    const {log} = await import('@clack/prompts');

    await runAgent({
      agentPath: 'agent.ts',
      sessionService: mockSessionService,
    });

    expect(log.error).toHaveBeenCalledWith('a plain string failure');
    expect(outro).toHaveBeenCalledWith('Run failed');
  });

  it('should process user query before exiting', async () => {
    (text as Mock)
      .mockResolvedValueOnce('Hello agent') // First query
      .mockResolvedValueOnce('exit'); // Then exit
    (isCancel as unknown as Mock).mockReturnValue(false);
    const mockSessionService = createMockSessionService();

    const mockRunAsync = vi.fn().mockImplementation(async function* () {
      yield {
        author: 'model',
        content: {parts: [{text: 'Response'}]},
      };
    });
    (Runner as unknown as Mock).mockImplementation(() => ({
      runAsync: mockRunAsync,
    }));

    await runAgent({
      agentPath: 'agent.ts',
      sessionService: mockSessionService,
    });

    // runAsync should have been called exactly once (for 'Hello agent')
    expect(mockRunAsync).toHaveBeenCalledTimes(1);
    expect(mockRunAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        newMessage: {role: 'user', parts: [{text: 'Hello agent'}]},
      }),
    );
  });

  it('should exit interactive loop on case-insensitive "quit" or "exit" with whitespace', async () => {
    for (const exitCommand of ['quit', 'QUIT', 'EXIT', ' exit ', ' quit ']) {
      vi.clearAllMocks();
      (text as Mock).mockResolvedValueOnce(exitCommand);
      (isCancel as unknown as Mock).mockReturnValue(false);
      const mockSessionService = createMockSessionService();

      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield* [];
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(mockRunAsync).not.toHaveBeenCalled();
      expect(outro).toHaveBeenCalledWith('Happy Agent Building!');
    }
  });

  it('should call outro after completing savedSessionFile interaction', async () => {
    const sessionContent = {
      id: 'old-session',
      appName: 'test-agent',
      userId: 'test_user',
      events: [],
    };
    (loadFileData as Mock).mockResolvedValue(sessionContent);
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      savedSessionFile: 'session.json',
      sessionService: mockSessionService,
    });

    expect(outro).toHaveBeenCalledWith('Happy Agent Building!');
    // outro should only be called once
    expect(outro).toHaveBeenCalledTimes(1);
  });

  it('should call text with session ID message when prompting', async () => {
    (text as Mock)
      .mockResolvedValueOnce('exit')
      .mockResolvedValueOnce('my-session-id');
    (isCancel as unknown as Mock).mockReturnValue(false);
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      saveSession: true,
      sessionService: mockSessionService,
    });

    expect(text).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Session ID to save (will be used as filename)',
        initialValue: expect.any(String),
        placeholder: 'e.g. my-session',
      }),
    );
  });

  describe('spinner behavior in interactive mode', () => {
    it('should create and start spinner with "Thinking..." when user submits a query and stdout is TTY', async () => {
      // isTTY is set to true in beforeEach
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);
      (text as Mock)
        .mockResolvedValueOnce('Hello agent')
        .mockResolvedValueOnce('exit');
      (isCancel as unknown as Mock).mockReturnValue(false);
      const mockSessionService = createMockSessionService();

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(spinner).toHaveBeenCalled();
      expect(mockSpinner.start).toHaveBeenCalledWith('Thinking...');
    });

    it('should stop spinner when a text response is received', async () => {
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);
      (text as Mock)
        .mockResolvedValueOnce('Hello agent')
        .mockResolvedValueOnce('exit');
      (isCancel as unknown as Mock).mockReturnValue(false);
      const mockSessionService = createMockSessionService();

      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield {
          author: 'model',
          content: {parts: [{text: 'Hello back'}]},
        };
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should stop spinner after loop even when no text content events are emitted', async () => {
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);
      (text as Mock)
        .mockResolvedValueOnce('Hello agent')
        .mockResolvedValueOnce('exit');
      (isCancel as unknown as Mock).mockReturnValue(false);
      const mockSessionService = createMockSessionService();

      // Events with no text content
      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield {author: 'model', content: {parts: [{}]}};
        yield {author: 'model', content: null};
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(mockSpinner.start).toHaveBeenCalledWith('Thinking...');
      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should create a new spinner for each user query in interactive mode', async () => {
      const spinnerInstances: Array<{start: Mock; stop: Mock}> = [];
      (spinner as Mock).mockImplementation(() => {
        const instance = {start: vi.fn(), stop: vi.fn()};
        spinnerInstances.push(instance);
        return instance;
      });
      (text as Mock)
        .mockResolvedValueOnce('First query')
        .mockResolvedValueOnce('Second query')
        .mockResolvedValueOnce('exit');
      (isCancel as unknown as Mock).mockReturnValue(false);
      const mockSessionService = createMockSessionService();

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(spinner).toHaveBeenCalledTimes(2);
      expect(spinnerInstances).toHaveLength(2);
      for (const instance of spinnerInstances) {
        expect(instance.start).toHaveBeenCalledWith('Thinking...');
        expect(instance.stop).toHaveBeenCalled();
      }
    });

    it('should not create spinner for empty or whitespace-only input', async () => {
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);
      (text as Mock)
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('   ')
        .mockResolvedValueOnce('exit');
      (isCancel as unknown as Mock).mockReturnValue(false);
      const mockSessionService = createMockSessionService();

      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield* [];
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(spinner).not.toHaveBeenCalled();
      expect(mockSpinner.start).not.toHaveBeenCalled();
    });

    it('should not create spinner when input is cancelled', async () => {
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);
      const cancelSymbol = Symbol('cancel');
      (text as Mock).mockResolvedValue(cancelSymbol);
      (isCancel as unknown as Mock).mockReturnValue(true);
      const mockSessionService = createMockSessionService();

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(spinner).not.toHaveBeenCalled();
    });

    it('should not create spinner when stdout is not TTY', async () => {
      Object.defineProperty(process.stdout, 'isTTY', {
        value: false,
        configurable: true,
      });
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);
      (text as Mock)
        .mockResolvedValueOnce('Hello agent')
        .mockResolvedValueOnce('exit');
      (isCancel as unknown as Mock).mockReturnValue(false);
      const mockSessionService = createMockSessionService();

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(spinner).not.toHaveBeenCalled();

      // Reset isTTY for other tests
      Object.defineProperty(process.stdout, 'isTTY', {
        value: true,
        configurable: true,
      });
    });
  });

  describe('spinner behavior in input file mode', () => {
    it('should create and start spinner with "Thinking..." for each query when stdout is TTY', async () => {
      const spinnerInstances: Array<{start: Mock; stop: Mock}> = [];
      (spinner as Mock).mockImplementation(() => {
        const instance = {start: vi.fn(), stop: vi.fn()};
        spinnerInstances.push(instance);
        return instance;
      });

      const inputFileContent = {
        state: {},
        queries: ['Query one', 'Query two'],
      };
      (loadFileData as Mock).mockResolvedValue(inputFileContent);
      const mockSessionService = createMockSessionService();

      await runAgent({
        agentPath: 'agent.ts',
        inputFile: 'input.json',
        sessionService: mockSessionService,
      });

      expect(spinner).toHaveBeenCalledTimes(2);
      for (const instance of spinnerInstances) {
        expect(instance.start).toHaveBeenCalledWith('Thinking...');
      }
    });

    it('should stop spinner when text content is received in input file mode', async () => {
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);

      const inputFileContent = {
        state: {},
        queries: ['Hello'],
      };
      (loadFileData as Mock).mockResolvedValue(inputFileContent);
      const mockSessionService = createMockSessionService();

      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield {
          author: 'model',
          content: {parts: [{text: 'Response text'}]},
        };
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        inputFile: 'input.json',
        sessionService: mockSessionService,
      });

      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should stop spinner after loop even with no text events in input file mode', async () => {
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);

      const inputFileContent = {
        state: {},
        queries: ['Query with no response'],
      };
      (loadFileData as Mock).mockResolvedValue(inputFileContent);
      const mockSessionService = createMockSessionService();

      // Runner emits events with no usable text
      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield {author: 'model', content: {parts: [{text: ''}]}};
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        inputFile: 'input.json',
        sessionService: mockSessionService,
      });

      expect(mockSpinner.start).toHaveBeenCalledWith('Thinking...');
      // stop() is called once at the end of the loop (idempotent stop)
      expect(mockSpinner.stop).toHaveBeenCalled();
    });

    it('should stop spinner only once per query when text is received (idempotent stop)', async () => {
      const mockSpinner = {start: vi.fn(), stop: vi.fn()};
      (spinner as Mock).mockReturnValue(mockSpinner);

      const inputFileContent = {
        state: {},
        queries: ['Single query'],
      };
      (loadFileData as Mock).mockResolvedValue(inputFileContent);
      const mockSessionService = createMockSessionService();

      // Emit two text events - stop should be called on the first, then again at end of loop
      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield {author: 'model', content: {parts: [{text: 'First chunk'}]}};
        yield {author: 'model', content: {parts: [{text: 'Second chunk'}]}};
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        inputFile: 'input.json',
        sessionService: mockSessionService,
      });

      // stop() is called on first text event AND after the loop, but spinner is idempotent
      expect(mockSpinner.stop).toHaveBeenCalled();
      // start() should only be called once per query
      expect(mockSpinner.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('non-interactive mode (piped stdin)', () => {
    beforeEach(() => {
      // Force the non-TTY branch of getQueries() to read from readline.
      (process.stdin as unknown as {isTTY: boolean}).isTTY = false;
    });

    it('should process piped lines and stop at "exit" without prompting via text()', async () => {
      const {mockInterface, closeMock} = createMockReadlineInterface([
        'Hello from pipe',
        'exit',
      ]);
      (createInterface as unknown as Mock).mockReturnValue(mockInterface);

      const mockSessionService = createMockSessionService();
      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield {author: 'model', content: {parts: [{text: 'Reply'}]}};
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(mockRunAsync).toHaveBeenCalledTimes(1);
      expect(mockRunAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          newMessage: {role: 'user', parts: [{text: 'Hello from pipe'}]},
        }),
      );
      expect(text).not.toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalled();
    });

    it('should skip blank and whitespace-only piped lines without invoking the runner', async () => {
      const {mockInterface, closeMock} = createMockReadlineInterface([
        '',
        '   ',
        'exit',
      ]);
      (createInterface as unknown as Mock).mockReturnValue(mockInterface);

      const mockSessionService = createMockSessionService();
      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield* [];
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(mockRunAsync).not.toHaveBeenCalled();
      expect(closeMock).toHaveBeenCalled();
    });

    it('should process multiple piped lines sequentially before exiting on "exit"', async () => {
      const {mockInterface, closeMock} = createMockReadlineInterface([
        'first line',
        'second line',
        'exit',
      ]);
      (createInterface as unknown as Mock).mockReturnValue(mockInterface);

      const mockSessionService = createMockSessionService();
      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield* [];
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(mockRunAsync).toHaveBeenCalledTimes(2);
      expect(closeMock).toHaveBeenCalled();
    });

    it('should close the readline interface (finally block) even when the runner throws mid-loop', async () => {
      const {mockInterface, closeMock} = createMockReadlineInterface([
        'trigger failure',
      ]);
      (createInterface as unknown as Mock).mockReturnValue(mockInterface);

      const mockSessionService = createMockSessionService();
      const mockRunAsync = vi.fn().mockImplementation(async function* () {
        yield* [];
        throw new Error('runner exploded');
      });
      (Runner as unknown as Mock).mockImplementation(() => ({
        runAsync: mockRunAsync,
      }));
      const {log} = await import('@clack/prompts');

      await runAgent({
        agentPath: 'agent.ts',
        sessionService: mockSessionService,
      });

      expect(closeMock).toHaveBeenCalled();
      expect(log.error).toHaveBeenCalledWith('runner exploded');
    });
  });
});
