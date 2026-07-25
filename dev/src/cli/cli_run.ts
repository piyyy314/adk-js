/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {intro, isCancel, log, outro, spinner, text} from '@clack/prompts';
import {
  BaseAgent,
  BaseArtifactService,
  BaseMemoryService,
  BaseSessionService,
  InMemoryArtifactService,
  InMemoryMemoryService,
  InMemorySessionService,
  Runner,
  Session,
} from '@google/adk';
import * as path from 'node:path';
import {createInterface} from 'node:readline';

import {AgentFile, AgentFileOptions} from '../utils/agent_loader.js';
import {handleCancellation} from '../utils/cli_utils.js';
import {loadFileData, saveToFile} from '../utils/file_utils.js';

const dirname = process.cwd();

interface InputFile {
  state: Record<string, unknown>;
  queries: string[];
}

interface RunFromInputFileOptions {
  appName: string;
  userId: string;
  agent: BaseAgent;
  artifactService: BaseArtifactService;
  sessionService: BaseSessionService;
  memoryService?: BaseMemoryService;
  filePath: string;
}
async function runFromInputFile(
  options: RunFromInputFileOptions,
): Promise<Session | undefined> {
  const fileContent = await loadFileData<InputFile>(
    path.join(dirname, options.filePath),
  );
  if (!fileContent) {
    return;
  }

  fileContent.state['_time'] = new Date().toISOString();

  const session = await options.sessionService.createSession({
    appName: options.appName,
    userId: options.userId,
    state: fileContent.state,
  });

  const runner = new Runner(options);

  for (const query of fileContent.queries) {
    console.log(`[user]: ${query}`);

    const runOptions = {
      userId: session.userId,
      sessionId: session.id,
      newMessage: {role: 'user', parts: [{text: query}]},
    };

    const s = process.stdout.isTTY ? spinner() : null;
    s?.start('Thinking...');
    let spinnerStopped = false;
    for await (const event of runner.runAsync(runOptions)) {
      if (event.content && event.content.parts) {
        const text = event.content.parts
          .map((part) => part.text || '')
          .join('');
        if (text) {
          if (process.stdout.isTTY) {
            if (!spinnerStopped) {
              s?.stop();
              spinnerStopped = true;
              process.stdout.write(`[${event.author}]: `);
            }
            process.stdout.write(text);
          } else {
            console.log(`[${event.author}]: ${text}`);
          }
        }
      }
    }
    if (process.stdout.isTTY && spinnerStopped) {
      process.stdout.write('\n');
    } else {
      s?.stop();
    }
  }

  return session;
}

interface RunInteractivelyOptions {
  rootAgent: BaseAgent;
  session: Session;
  artifactService: BaseArtifactService;
  sessionService: BaseSessionService;
  memoryService?: BaseMemoryService;
}

/**
 * Provides an async generator of user queries from stdin.
 */
async function* getQueries(): AsyncGenerator<string | symbol, void, unknown> {
  if (process.stdin.isTTY === true) {
    while (true) {
      const input = await text({
        message: 'Message',
        placeholder: 'Type your message here (or "exit" to quit)...',
      });
      yield input;
    }
  } else {
    // Non-interactive mode (piped stdin): read lines directly via readline.
    const rl = createInterface({input: process.stdin, terminal: false});
    try {
      for await (const line of rl) {
        yield line;
      }
    } finally {
      rl.close();
    }
  }
}

/**
 * Runs an agent in an interactive CLI loop, sending each user input to the agent runner and printing emitted events.
 *
 * The loop ends when the user cancels the prompt or types `exit`. Empty or whitespace-only inputs are ignored.
 *
 * @param options - Configuration for the interactive run. Required fields:
 *   - `rootAgent`: the agent implementation to drive.
 *   - `session`: the current session (provides `userId` and `id`).
 *   - `artifactService`, `sessionService`, `memoryService` (optional): services passed to the runner.
 * @returns `true` when cancelled from the interactive prompt, otherwise `false`.
 */
async function runInteractively(
  options: RunInteractivelyOptions,
): Promise<boolean> {
  const runner = new Runner({
    appName: options.rootAgent.name,
    agent: options.rootAgent,
    artifactService: options.artifactService,
    sessionService: options.sessionService,
    memoryService: options.memoryService,
  });

  for await (const query of getQueries()) {
    if (isCancel(query)) {
      if (process.stdout.isTTY) {
        outro('Operation cancelled');
      }
      return true;
    }
    if (query === 'exit') {
      return false;
    }
    if (typeof query !== 'string' || !query.trim()) {
      continue;
    }

    const s = process.stdout.isTTY ? spinner() : null;
    s?.start('Thinking...');
    let spinnerStopped = false;
    try {
      for await (const event of runner.runAsync({
        userId: options.session.userId,
        sessionId: options.session.id,
        newMessage: {role: 'user', parts: [{text: query}]},
      })) {
        if (event.content && event.content.parts) {
          const textVal = event.content.parts
            .map((part) => part.text || '')
            .join('');
          if (textVal) {
            if (!spinnerStopped) {
              s?.stop();
              spinnerStopped = true;
            }
            console.log(`[${event.author}]: ${textVal}`);
          }
        }
      }
    } finally {
      if (!spinnerStopped) {
        s?.stop();
      }
    }
  }

  return false;
}

/**
 * Runs an interactive CLI for a certain agent.
 */
export interface RunAgentOptions {
  agentPath: string;
  inputFile?: string;
  savedSessionFile?: string;
  saveSession?: boolean;
  sessionId?: string;
  artifactService?: BaseArtifactService;
  sessionService?: BaseSessionService;
  memoryService?: BaseMemoryService;
  otelToCloud?: boolean;
  agentFileLoadOptions?: AgentFileOptions;
}
/**
 * Run an agent defined by an agent file, driving it from an input file, a saved session, or an interactive CLI and optionally persist the resulting session.
 *
 * Runs in one of three modes determined by `options`: if `inputFile` is provided, executes the ordered queries from that file; if `savedSessionFile` is provided, replays the saved session events and then enters interactive mode; otherwise starts a fresh interactive session. Uses in-memory defaults for artifact, session, and memory services when overrides are not supplied. If `saveSession` is true, prompts for a session ID (unless `sessionId` is provided) and writes the session to `${agentPath}/${sessionId}.session.json`; cancelling interactive input only exits the interaction loop, while cancelling the session ID prompt aborts saving.
 *
 * @param options - Configuration for running the agent including the agent file path, optional input or saved session file, whether to save the session, optional sessionId to use when saving, and optional service overrides for artifactService, sessionService, and memoryService.
 */
export async function runAgent(options: RunAgentOptions): Promise<void> {
  try {
    const userId = 'test_user';
    const artifactService =
      options.artifactService || new InMemoryArtifactService();
    const sessionService =
      options.sessionService || new InMemorySessionService();
    const memoryService = options.memoryService || new InMemoryMemoryService();
    await using agentFile = new AgentFile(
      path.join(dirname, options.agentPath),
      options.agentFileLoadOptions,
    );
    const rootAgent = await agentFile.load();

    let session = await sessionService.createSession({
      appName: rootAgent.name,
      userId,
    });

    if (process.stdout.isTTY && !options.inputFile) {
      const mode = options.savedSessionFile
        ? 'Resuming session'
        : 'Running agent';
      intro(`${mode}: ${rootAgent.name}`);
    }

    if (options.inputFile) {
      session =
        (await runFromInputFile({
          appName: rootAgent.name,
          userId,
          agent: rootAgent,
          artifactService,
          sessionService,
          memoryService,
          filePath: options.inputFile,
        })) || session;
    } else {
      if (options.savedSessionFile) {
        const loadedSession = await loadFileData<Session>(
          options.savedSessionFile,
        );
        if (loadedSession) {
          for (const event of loadedSession.events) {
            await sessionService.appendEvent({session, event});
            const content = event.content;
            if (content && content.parts?.length) {
              const text = content.parts
                .map((part) => part.text || '')
                .join('');
              if (text) {
                console.log(`[${event.author}]: ${text}`);
              }
            }
          }
        }
      }

      const cancelled = await runInteractively({
        rootAgent,
        artifactService,
        sessionService,
        memoryService,
        session,
      });
      if (cancelled) return;
    }

    if (options.saveSession) {
      const defaultSessionId = new Date().toISOString().replace(/[:.]/g, '-');
      const sessionId =
        options.sessionId ||
        (await text({
          message: 'Session ID to save (will be used as filename)',
          initialValue: defaultSessionId,
          placeholder: 'e.g. my-session',
          validate: (value) => {
            if (!value) return 'Session ID is required';
            if (/[^-a-zA-Z0-9_]/.test(value)) {
              return 'Session ID contains invalid characters';
            }
            return;
          },
        }));

      if (handleCancellation(sessionId)) {
        return;
      }

      const sessionPath = path.join(
        options.agentPath,
        `${sessionId}.session.json`,
      );
      const sessionToStore = await sessionService.getSession({
        appName: session.appName,
        userId: session.userId,
        sessionId: session.id,
      });
      await saveToFile(path.join(dirname, sessionPath), sessionToStore);

      log.info(
        `Session saved to ${sessionPath}. To resume, run: adk run ${options.agentPath} --resume ${sessionPath}`,
      );
    }

    if (process.stdout.isTTY && !options.inputFile)
      outro('Happy Agent Building!');
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e));
    if (process.stdout.isTTY && !options.inputFile) {
      outro('Run failed');
    }
  }
}
