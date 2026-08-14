/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {BaseAgent, BaseSessionService, Runner} from '@google/adk';
import {intro, isCancel, log, outro, spinner, text} from '@clack/prompts';
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
    info: vi.fn(),
    step: vi.fn(),
    error: vi.fn(),
  },
  spinner: vi.fn().mockReturnValue({
    start: vi.fn(),
    stop: vi.fn(),
  }),
  text: vi.fn(),
  isCancel: vi.fn().mockReturnValue(false),
}));

describe('cli_run', () => {
  let mockAgentFile: AgentFile;
  let mockRootAgent: BaseAgent;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRootAgent = {
      name: 'test-agent',
    } as unknown as BaseAgent;

    mockAgentFile = {
      load: vi.fn().mockResolvedValue(mockRootAgent),
      [Symbol.asyncDispose]: vi.fn(),
    } as unknown as AgentFile;

    (AgentFile as unknown as Mock).mockImplementation(() => mockAgentFile);

    (text as Mock).mockResolvedValue('exit');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should run interactively by default', async () => {
    await runAgent({agentPath: 'agent.ts'});

    expect(AgentFile).toHaveBeenCalledWith(
      expect.stringContaining('agent.ts'),
      undefined,
    );
    expect(mockAgentFile.load).toHaveBeenCalled();
    expect(intro).toHaveBeenCalled();
    expect(text).toHaveBeenCalled();
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
    expect(text).toHaveBeenCalled();
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

  it('should prompt with the expected message and placeholder in the interactive loop', async () => {
    const mockSessionService = createMockSessionService();

    await runAgent({agentPath: 'agent.ts', sessionService: mockSessionService});

    expect(text).toHaveBeenCalledWith({
      message: 'user',
      placeholder: 'Type your message (or "exit" to quit)',
    });
  });

  it('should skip empty or whitespace-only input without invoking the runner', async () => {
    const mockSessionService = createMockSessionService();
    (text as Mock)
      .mockResolvedValueOnce('   ')
      .mockResolvedValueOnce('exit');

    await runAgent({agentPath: 'agent.ts', sessionService: mockSessionService});

    expect(text).toHaveBeenCalledTimes(2);
    const runnerInstance = (Runner as unknown as Mock).mock.results[0].value;
    expect(runnerInstance.runAsync).not.toHaveBeenCalled();
  });

  it('should break the interactive loop when the input prompt is cancelled', async () => {
    const mockSessionService = createMockSessionService();
    (text as Mock).mockResolvedValueOnce('would have been sent');
    (isCancel as Mock).mockReturnValueOnce(true);

    await runAgent({agentPath: 'agent.ts', sessionService: mockSessionService});

    expect(text).toHaveBeenCalledTimes(1);
    const runnerInstance = (Runner as unknown as Mock).mock.results[0].value;
    expect(runnerInstance.runAsync).not.toHaveBeenCalled();
  });

  it('should show a spinner and stop it with "Agent replied:" when the agent responds', async () => {
    const mockSessionService = createMockSessionService();
    const spinnerInstance = {start: vi.fn(), stop: vi.fn()};
    (spinner as Mock).mockReturnValueOnce(spinnerInstance);
    (text as Mock).mockResolvedValueOnce('hello').mockResolvedValueOnce('exit');

    await runAgent({agentPath: 'agent.ts', sessionService: mockSessionService});

    expect(spinnerInstance.start).toHaveBeenCalledWith('Agent is thinking...');
    expect(spinnerInstance.stop).toHaveBeenCalledWith('Agent replied:');
    expect(spinnerInstance.stop).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith('model: Response from model');
  });

  it('should stop the spinner with "Agent finished processing." when the agent yields no text', async () => {
    const mockSessionService = createMockSessionService();
    const spinnerInstance = {start: vi.fn(), stop: vi.fn()};
    (spinner as Mock).mockReturnValueOnce(spinnerInstance);
    (Runner as unknown as Mock).mockImplementationOnce(() => ({
      runAsync: vi.fn().mockImplementation(async function* () {
        yield {author: 'model', content: undefined};
      }),
    }));
    (text as Mock).mockResolvedValueOnce('hello').mockResolvedValueOnce('exit');

    await runAgent({agentPath: 'agent.ts', sessionService: mockSessionService});

    expect(spinnerInstance.stop).toHaveBeenCalledWith(
      'Agent finished processing.',
    );
    expect(log.info).not.toHaveBeenCalled();
  });

  it('should join multiple content parts, treating missing text as empty', async () => {
    const mockSessionService = createMockSessionService();
    (Runner as unknown as Mock).mockImplementationOnce(() => ({
      runAsync: vi.fn().mockImplementation(async function* () {
        yield {
          author: 'model',
          content: {parts: [{}, {text: 'Hello '}, {text: 'world'}]},
        };
      }),
    }));
    (text as Mock).mockResolvedValueOnce('hi').mockResolvedValueOnce('exit');

    await runAgent({agentPath: 'agent.ts', sessionService: mockSessionService});

    expect(log.info).toHaveBeenCalledWith('model: Hello world');
  });

  it('should log each query with log.step and each reply with log.info when running from an input file', async () => {
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

    expect(log.step).toHaveBeenCalledWith('user: Hello');
    expect(log.step).toHaveBeenCalledWith('user: How are you?');
    expect(log.info).toHaveBeenCalledWith('model: Response from model');
  });

  it('should log replayed session events via log.info', async () => {
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

    expect(log.info).toHaveBeenCalledWith('user: Hi');
    expect(log.info).toHaveBeenCalledWith('model: Hello');
  });

  it('should call intro with the agent path when starting', async () => {
    const mockSessionService = createMockSessionService();

    await runAgent({agentPath: 'agent.ts', sessionService: mockSessionService});

    expect(intro).toHaveBeenCalledWith('Running agent agent.ts');
  });

  it('should call outro with "Exiting agent." when the session is not saved', async () => {
    const mockSessionService = createMockSessionService();

    await runAgent({agentPath: 'agent.ts', sessionService: mockSessionService});

    expect(outro).toHaveBeenCalledWith('Exiting agent.');
    expect(saveToFile).not.toHaveBeenCalled();
  });

  it('should prompt with the expected message and initial value when saving without a session id', async () => {
    const mockSessionService = createMockSessionService();
    (text as Mock)
      .mockResolvedValueOnce('exit')
      .mockResolvedValueOnce('prompted-session-id');

    await runAgent({
      agentPath: 'agent.ts',
      saveSession: true,
      sessionService: mockSessionService,
    });

    expect(text).toHaveBeenLastCalledWith({
      message: 'Session ID to save',
      initialValue: 'session_1',
    });
  });

  it('should exit without saving when the session id prompt is cancelled', async () => {
    const mockSessionService = createMockSessionService();
    (text as Mock)
      .mockResolvedValueOnce('exit') // interactive loop exit
      .mockResolvedValueOnce(undefined); // sessionId prompt result
    (isCancel as Mock)
      .mockReturnValueOnce(false) // interactive loop query, exits via 'exit' check
      .mockReturnValueOnce(true); // sessionId prompt is cancelled

    await runAgent({
      agentPath: 'agent.ts',
      saveSession: true,
      sessionService: mockSessionService,
    });

    expect(outro).toHaveBeenCalledWith('Exiting without saving.');
    expect(saveToFile).not.toHaveBeenCalled();
  });

  it('should not prompt for a session id when one is already provided', async () => {
    const mockSessionService = createMockSessionService();

    await runAgent({
      agentPath: 'agent.ts',
      saveSession: true,
      sessionId: 'my-session',
      sessionService: mockSessionService,
    });

    // Only the interactive loop query prompt should occur; no session-id prompt.
    expect(text).toHaveBeenCalledTimes(1);
    expect(outro).toHaveBeenCalledWith(
      expect.stringContaining('my-session.session.json'),
    );
  });

  it('should log errors via log.error when an exception occurs', async () => {
    const error = new Error('Load failed');
    (mockAgentFile.load as unknown as Mock).mockRejectedValueOnce(error);

    await runAgent({agentPath: 'agent.ts'});

    expect(log.error).toHaveBeenCalledWith(String(error));
  });
});
