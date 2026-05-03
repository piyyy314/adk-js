/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {intro, isCancel, outro, spinner, text} from '@clack/prompts';
import {BaseAgent, BaseSessionService, Runner} from '@google/adk';
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
  text: vi.fn(),
  isCancel: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
}));

describe('cli_run', () => {
  let mockAgentFile: AgentFile;
  let mockRootAgent: BaseAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Treat stdin/stdout as TTY in unit tests so that getUserInput uses
    // @clack/prompts text() (which is mocked), not the readline fallback.
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      configurable: true,
    });
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

    (text as Mock).mockResolvedValue('exit');
    (isCancel as unknown as Mock).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore isTTY to its original value
    Object.defineProperty(process.stdin, 'isTTY', {
      value: undefined,
      configurable: true,
    });
    Object.defineProperty(process.stdout, 'isTTY', {
      value: undefined,
      configurable: true,
    });
  });

  it('should run interactively by default', async () => {
    await runAgent({agentPath: 'agent.ts'});

    expect(AgentFile).toHaveBeenCalledWith(
      expect.stringContaining('agent.ts'),
      undefined,
    );
    expect(mockAgentFile.load).toHaveBeenCalled();
    expect(intro).toHaveBeenCalledWith('Running agent test-agent');
    expect(text).toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith('Exiting agent');
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
    expect(intro).toHaveBeenCalledWith('Resuming agent test-agent');
    expect(text).toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith('Exiting agent');
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

  it('should still save session if interaction is cancelled', async () => {
    const mockSessionService = createMockSessionService();
    (text as Mock).mockResolvedValueOnce(Symbol('cancel'));
    (isCancel as unknown as Mock).mockReturnValueOnce(true);

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

    const mockRunAsync = vi.fn().mockImplementation(async function* () {});
    (Runner as unknown as Mock).mockImplementation(() => ({
      runAsync: mockRunAsync,
    }));

    await runAgent({
      agentPath: 'agent.ts',
      sessionService: mockSessionService,
    });

    // runAsync should not have been called because cancel breaks the loop immediately
    expect(mockRunAsync).not.toHaveBeenCalled();
    expect(outro).toHaveBeenCalledWith('Exiting agent');
  });

  it('should continue loop on empty input without processing', async () => {
    (text as Mock)
      .mockResolvedValueOnce('') // Empty input - should continue
      .mockResolvedValueOnce('   ') // Whitespace - should continue
      .mockResolvedValueOnce('exit'); // Exit
    (isCancel as unknown as Mock).mockReturnValue(false);
    const mockSessionService = createMockSessionService();

    const mockRunAsync = vi.fn().mockImplementation(async function* () {});
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
    // spinner should have been used for the query (stdout is mocked as TTY)
    expect(spinner).toHaveBeenCalled();
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

    expect(outro).toHaveBeenCalledWith('Exiting agent');
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
      expect.objectContaining({message: 'Session ID to save: '}),
    );
  });
});
