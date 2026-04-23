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
    log.step(`user: ${query}`);

    const runOptions = {
      userId: session.userId,
      sessionId: session.id,
      newMessage: {role: 'user', parts: [{text: query}]},
    };

    for await (const event of runner.runAsync(runOptions)) {
      if (event.content && event.content.parts) {
        const text = event.content.parts
          .map((part) => part.text || '')
          .join('');
        if (text) {
          log.info(`${event.author}: ${text}`);
        }
      }
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

  while (true) {
    const query = await text({
      message: 'user',
      placeholder: 'Type your message (or "exit" to quit)',
    });

    if (isCancel(query) || query === 'exit') break;
    if (!query?.trim()) continue;

    const s = spinner();
    s.start('Agent is thinking...');
    let hasReplied = false;

    for await (const event of runner.runAsync({
      userId: options.session.userId,
      sessionId: options.session.id,
      newMessage: {role: 'user', parts: [{text: query}]},
    })) {
      const textContent = event.content?.parts?.map((p) => p.text).join('') || '';
      if (textContent) {
        if (!hasReplied) {
          s.stop('Agent replied:');
          hasReplied = true;
        }
        log.info(`${event.author}: ${textContent}`);
      }
    }
    if (!hasReplied) s.stop('Agent finished processing.');
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
export async function runAgent(options: RunAgentOptions): Promise<void> {
  intro(`Running agent ${options.agentPath}`);
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
              log.info(`${event.author}: ${text}`);
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
    } else {
      await runInteractively({
        rootAgent,
        artifactService,
        sessionService,
        memoryService,
        session,
      });
    }

    if (options.saveSession) {
      const sessionId =
        options.sessionId ||
        (await text({message: 'Session ID to save', initialValue: 'session_1'}));

      if (isCancel(sessionId)) {
        outro('Exiting without saving.');
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
      outro(`Session saved to ${sessionPath}`);
    } else {
      outro('Exiting agent.');
    }
  } catch (e) {
    log.error(String(e));
  }
}
