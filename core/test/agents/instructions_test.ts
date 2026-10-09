/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BaseAgent,
  InMemoryArtifactService,
  InvocationContext,
  PluginManager,
  ReadonlyContext,
  createSession,
} from '@google/adk';
import {describe, expect, it} from 'vitest';
import {injectSessionState} from '../../src/agents/instructions.js';

class MockAgent extends BaseAgent {
  protected async *runAsyncImpl(_context: InvocationContext) {}
  protected async *runLiveImpl(_context: InvocationContext) {}
}

function createMockReadonlyContext(
  state: Record<string, unknown> = {},
  artifactService?: InMemoryArtifactService,
): ReadonlyContext {
  const agent = new MockAgent({name: 'test_agent'});
  const invocationContext = new InvocationContext({
    invocationId: 'test-invocation',
    agent,
    session: createSession({
      id: 'test-session',
      events: [],
      appName: 'test-app',
      userId: 'test-user',
      state,
    }),
    pluginManager: new PluginManager([]),
    artifactService,
  });

  return new ReadonlyContext(invocationContext);
}

describe('injectSessionState', () => {
  it('should inject standard state variables into instruction template', async () => {
    const readonlyContext = createMockReadonlyContext({
      user_name: 'Alice',
      'user:role': 'admin',
      'app:version': '1.0',
      'temp:counter': 42,
    });

    const template =
      'Hello {user_name}, role is {user:role}, app version is {app:version}, count: {temp:counter}.';
    const result = await injectSessionState(template, readonlyContext);

    expect(result).toBe(
      'Hello Alice, role is admin, app version is 1.0, count: 42.',
    );
  });

  it('should support optional state variables with ? suffix', async () => {
    const readonlyContext = createMockReadonlyContext({
      user_name: 'Bob',
    });

    const template = 'Hello {user_name}, title: {title?}.';
    const result = await injectSessionState(template, readonlyContext);

    expect(result).toBe('Hello Bob, title: .');
  });

  it('should throw error when non-optional variable is missing', async () => {
    const readonlyContext = createMockReadonlyContext({});

    const template = 'Hello {missing_var}.';
    await expect(injectSessionState(template, readonlyContext)).rejects.toThrow(
      'Context variable not found: `missing_var`.',
    );
  });

  it('should ignore non-state placeholder patterns', async () => {
    const readonlyContext = createMockReadonlyContext({});

    const template = 'This is {123invalid} and {bad:key:name}.';
    const result = await injectSessionState(template, readonlyContext);

    expect(result).toBe('This is {123invalid} and {bad:key:name}.');
  });

  it('should inject artifact content when key starts with artifact.', async () => {
    const artifactService = new InMemoryArtifactService();
    await artifactService.saveArtifact({
      appName: 'test-app',
      userId: 'test-user',
      sessionId: 'test-session',
      filename: 'data.json',
      artifact: {text: '{"status": "ok"}'},
    });

    const readonlyContext = createMockReadonlyContext({}, artifactService);

    const template = 'Artifact content: {artifact.data.json}';
    const result = await injectSessionState(template, readonlyContext);

    expect(result).toContain('{"status": "ok"}');
  });
});
