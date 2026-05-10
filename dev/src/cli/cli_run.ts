/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

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
import {intro, isCancel, log, outro, spinner, text} from '@clack/prompts';
import * as path from 'node:path';
import * as readline from 'node:readline/promises';

import {AgentFile, AgentFileOptions} from '../utils/agent_loader.js';
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

    const s = spinner();
    s.start('Thinking...');
    for await (const event of runner.runAsync(runOptions)) {
      if (event.content && event.content.parts) {
        const text = event.content.parts
          .map((part) => part.text || '')
          .join('');
        if (text) {
          s.stop();
          console.log(`[${event.author}]: ${text}`);
        }
      }
    }
    s.stop();
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
 * Runs an agent in an interactive CLI loop, sending each user input to the agent runner and printing emitted events.
 *
 * The loop ends when the user cancels the prompt or types `exit`. Empty or whitespace-only inputs are ignored.
 *
 * @param options - Configuration for the interactive run. Required fields:
 *   - `rootAgent`: the agent implementation to drive.
 *   - `session`: the current session (provides `userId` and `id`).
 *   - `artifactService`, `sessionService`, `memoryService` (optional): services passed to the runner.
 */
async function runInteractively(
  options: RunInteractivelyOptions,
): Promise<void> {
  const runner = new Runner({
    appName: options.rootAgent.name,
    agent: options.rootAgent,
    artifactService: options.artifactService,
    sessionService: options.sessionService,
    memoryService: options.memoryService,
  });

  const isTTY = process.stdout.isTTY;
  const rl = isTTY
    ? undefined
    : readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

  while (true) {
    let query: string | symbol;
    if (isTTY) {
      query = await text({
        message: '[user]: ',
        placeholder: 'Type your message here (or "exit" to quit)...',
      });
    } else {
      process.stdout.write('[user]: ');
      query = await rl!.question('');
    }

    if (isCancel(query) || query === 'exit') {
      break;
    }

    if (!query || !query.trim()) {
      continue;
    }

    const s = spinner();
    if (isTTY) {
      s.start('Thinking...');
    }
    for await (const event of runner.runAsync({
      userId: options.session.userId,
      sessionId: options.session.id,
      newMessage: {role: 'user', parts: [{text: query}]},
    })) {
      if (event.content && event.content.parts) {
        const text = event.content.parts
          .map((part) => part.text || '')
          .join('');
        if (text) {
          if (isTTY) {
            s.stop();
          }
          console.log(`[${event.author}]: ${text}`);
        }
      }
    }
    if (isTTY) {
      s.stop();
    }
  }

  if (rl) {
    rl.close();
  }
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
    } else if (options.savedSessionFile) {
      if (process.stdout.isTTY) {
        intro(`Resuming agent ${rootAgent.name}`);
      }
      const loadedSession = await loadFileData<Session>(
        options.savedSessionFile,
      );
      if (loadedSession) {
        for (const event of loadedSession.events) {
          await sessionService.appendEvent({session, event});
          const content = event.content;
          if (content && content.parts?.length) {
            const text = content.parts.map((part) => part.text || '').join('');
            if (text) {
              console.log(`[${event.author}]: ${text}`);
            }
          }
        }
      }

      await runInteractively({
        rootAgent,
        artifactService,
        sessionService,
        memoryService,
        session,
      });
      if (process.stdout.isTTY) {
        outro('Happy Agent Building!');
      }
    } else {
      if (process.stdout.isTTY) {
        intro(`Running agent ${rootAgent.name}`);
      }
      await runInteractively({
        rootAgent,
        artifactService,
        sessionService,
        memoryService,
        session,
      });
      if (process.stdout.isTTY) {
        outro('Happy Agent Building!');
      }
    }

    if (options.saveSession) {
      const defaultSessionId = new Date().toISOString().replace(/[:.]/g, '-');
      const sessionId =
        options.sessionId ||
        (await text({
          message: 'Session ID to save: ',
          initialValue: defaultSessionId,
          placeholder: 'e.g. my-session',
        }));

      if (isCancel(sessionId)) {
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

      log.info(`Session saved to ${sessionPath}`);
    }
  } catch (e) {
    log.error(e instanceof Error ? e.message : String(e));
  }
}
