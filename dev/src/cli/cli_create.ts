/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {isCancel} from '@clack/prompts';
import {exec, execSync} from 'node:child_process';
import * as path from 'node:path';
import {promisify} from 'node:util';
import {
  createFolder,
  isFolderExists,
  listFiles,
  removeFolder,
  saveToFile,
} from '../utils/file_utils.js';
import {
  createSpinner,
  promptConfirm,
  promptError,
  promptIntro,
  promptNote,
  promptOutro,
  promptPassword,
  promptSelect,
  promptStep,
  promptText,
} from '../utils/cli_utils.js';

const execPromise = promisify(exec);
const dirname = process.cwd();

const TS_CONFIG = `{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "rootDir": "./",
    "outDir": "dist",
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "exactOptionalPropertyTypes": true,
    "noEmitOnError": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "pretty": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "strict": true
  }
}
`.trim();

const PACKAGE_JSON = (agentName: string, language: string) =>
  `
{
  "name": "${agentName}",
  "version": "1.0.0",
  "description": "",
  "main": "agent.${language}",
  "scripts": {
    "web": "npx @google/adk-devtools web",
    "cli": "npx @google/adk-devtools run agent.${language}"
  },
  "keywords": [],
  "author": "",
  "license": "ISC"
}
`.trim();

const AGENT_TEMPLATE = (model: string) =>
  `
import {FunctionTool, LlmAgent} from '@google/adk';
import {z} from 'zod';
import dotenv from 'dotenv';

dotenv.config();

/* Mock tool implementation */
const getCurrentTime = new FunctionTool({
  name: 'get_current_time',
  description: 'Returns the current time in a specified city.',
  parameters: z.object({
    city: z.string().describe("The name of the city for which to retrieve the current time."),
  }),
  execute: ({city}) => {
    return {status: 'success', report: \`The current time in \${city} is 10:30 AM\`};
  },
});

export const rootAgent = new LlmAgent({
  name: 'hello_time_agent',
  model: '${model}',
  description: 'Tells the current time in a specified city.',
  instruction: \`You are a helpful assistant that tells the current time in a city.
                Use the 'getCurrentTime' tool for this purpose.\`,
  tools: [getCurrentTime],
});
`.trim();

interface AgentCreationOptions {
  agentName: string;
  forceYes: boolean;
  model: string;
  apiKey: string;
  project: string;
  region: string;
  language: string;
}

async function getGcpProject(): Promise<string> {
  if (process.env.GOOGLE_CLOUD_PROJECT) {
    return process.env.GOOGLE_CLOUD_PROJECT;
  }
  try {
    const stdout = execSync('gcloud config get-value project', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return stdout.trim();
  } catch (_e: unknown) {
    return '';
  }
}

async function getGcpRegion(): Promise<string> {
  if (process.env.GOOGLE_CLOUD_LOCATION) {
    return process.env.GOOGLE_CLOUD_LOCATION;
  }
  try {
    const stdout = execSync('gcloud config get-value compute/region', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return stdout.trim();
  } catch (_e: unknown) {
    return '';
  }
}

async function generateAgentFolder(
  agentDir: string,
  forceYes: boolean,
): Promise<boolean> {
  if (!(await isFolderExists(agentDir))) {
    await createFolder(agentDir);
    return true;
  }

  const overwriteFolderResponse: symbol | boolean = forceYes
    ? true
    : await promptConfirm({
        message: `Folder ${agentDir} already exists. Would you like to overwrite existing folder?`,
      });

  if (isCancel(overwriteFolderResponse)) {
    return false;
  }

  if (!overwriteFolderResponse) {
    promptError(`Agent directory ${agentDir} already exists.`);
    return false;
  }

  await removeFolder(agentDir);
  await createFolder(agentDir);
  return true;
}

function generateEnvFile(options: AgentCreationOptions): string {
  const lines = [];
  if (options.apiKey) {
    lines.push(`GOOGLE_API_KEY=${options.apiKey}`);
    lines.push(`GOOGLE_GENAI_USE_VERTEXAI=0`);
  }
  if (options.project) {
    lines.push(`GOOGLE_CLOUD_PROJECT=${options.project}`);
  }
  if (options.region) {
    lines.push(`GOOGLE_CLOUD_LOCATION=${options.region}`);
  }
  if (options.region && options.project) {
    lines.push(`GOOGLE_GENAI_USE_VERTEXAI=1`);
  }
  return lines.join('\n');
}

async function generateFiles(options: AgentCreationOptions) {
  const agentDir = path.join(dirname, options.agentName);

  await saveToFile(
    path.join(agentDir, `agent.${options.language}`),
    AGENT_TEMPLATE(options.model || 'gemini-2.5-flash'),
  );
  await saveToFile(path.join(agentDir, '.env'), generateEnvFile(options));
  await saveToFile(
    path.join(agentDir, 'package.json'),
    PACKAGE_JSON(options.agentName, options.language),
  );
  if (options.language === 'ts') {
    await saveToFile(path.join(agentDir, 'tsconfig.json'), TS_CONFIG);
  }
}

export async function createAgent(options: AgentCreationOptions) {
  promptIntro('Agent Creation');
  const agentDir = path.join(dirname, options.agentName);
  const folderReady = await generateAgentFolder(agentDir, options.forceYes);
  if (!folderReady) {
    return;
  }

  if (!options.model) {
    const modelOptions = [
      {
        label: 'gemini-2.5-flash',
        value: 'gemini-2.5-flash',
        hint: 'Fast and cost-effective',
      },
      {
        label: 'gemini-2.5-pro',
        value: 'gemini-2.5-pro',
        hint: 'High performance for complex tasks',
      },
      {
        label: 'gemini-3-flash-preview',
        value: 'gemini-3-flash-preview',
        hint: 'Next-gen speed (preview)',
      },
      {
        label: 'gemini-3-pro-preview',
        value: 'gemini-3-pro-preview',
        hint: 'Next-gen intelligence (preview)',
      },
    ];
    const model: symbol | string = options.forceYes
      ? 'gemini-2.5-flash'
      : await promptSelect({
          message: 'Choose a model for the root agent',
          options: modelOptions,
        });

    if (isCancel(model)) {
      return;
    }
    options.model = model;
  }

  if (options.language !== 'js' && options.language !== 'ts') {
    const langOptions = [
      {label: 'TypeScript', value: 'ts', hint: 'Type-safe development'},
      {
        label: 'JavaScript',
        value: 'js',
        hint: 'Standard Node.js development',
      },
    ];
    const language = options.forceYes
      ? 'ts'
      : await promptSelect({
          message: 'Choose a language for the agent',
          options: langOptions,
        });

    if (isCancel(language)) {
      return;
    }
    options.language = language;
  }

  if (!options.apiKey && !options.project) {
    const backendOptions = [
      {
        label: 'Google AI',
        value: 'googleai',
        hint: 'Simple API key access',
      },
      {
        label: 'Vertex AI',
        value: 'vertex',
        hint: 'Enterprise-grade Google Cloud',
      },
    ];
    const backend: symbol | string = options.forceYes
      ? 'googleai'
      : await promptSelect({
          message: 'Choose a backend',
          options: backendOptions,
        });

    if (isCancel(backend)) {
      return;
    }

    if (backend === 'vertex') {
      const defaultProject = await getGcpProject();
      const defaultRegion = await getGcpRegion();

      const projectResponse: symbol | string = options.forceYes
        ? defaultProject
        : await promptText({
            message: 'Enter the Google Cloud Project ID',
            initialValue: defaultProject,
            placeholder: 'my-project-id',
          });

      if (isCancel(projectResponse)) {
        return;
      }
      options.project = projectResponse;

      const regionResponse: symbol | string = options.forceYes
        ? defaultRegion
        : await promptText({
            message: 'Enter the Google Cloud Region',
            initialValue: defaultRegion,
            placeholder: 'us-central1',
          });

      if (isCancel(regionResponse)) {
        return;
      }
      options.region = regionResponse;
    } else {
      const apiKeyResponse: symbol | string = options.forceYes
        ? ''
        : await promptPassword({
            message: 'Enter the Google API Key',
          });

      if (isCancel(apiKeyResponse)) {
        return;
      }
      options.apiKey = apiKeyResponse;
    }
  }

  promptStep('Generating files...');
  await generateFiles(options);

  const s = createSpinner();
  s.start('Installing dependencies...');
  try {
    if (options.language === 'ts') {
      await execPromise(`npm install typescript --save-dev`, {cwd: agentDir});
    }
    await execPromise(
      `npm install @google/adk @google/adk-devtools zod dotenv`,
      {
        cwd: agentDir,
      },
    );
    s.stop('Dependencies installed successfully.');
  } catch (e) {
    s.stop('Failed to install dependencies.', 1);
    promptError((e as Error).message);
  }

  const files = await listFiles(agentDir);

  promptNote(
    `Created the following files in ${agentDir}:\n` +
      files.map((file) => `  - ${file}`).join('\n') +
      `\n\nRun 'cd ${options.agentName} && npm run web' to start the agent in a web interface`,
    'Agent Created Successfully',
  );

  promptOutro('Happy Agent Building!');
}
