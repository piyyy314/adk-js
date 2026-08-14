/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// dev/test/config -> dev/test -> dev -> repo root
const ROOT_PACKAGE_JSON_PATH = path.resolve(
  __dirname,
  '../../../package.json',
);

interface RootPackageJson {
  name: string;
  devDependencies: Record<string, string>;
  [key: string]: unknown;
}

async function readRootPackageJson(): Promise<RootPackageJson> {
  const raw = await fs.readFile(ROOT_PACKAGE_JSON_PATH, 'utf-8');
  return JSON.parse(raw) as RootPackageJson;
}

/** Parses a caret semver range such as "^0.28.1" into numeric parts. */
function parseCaretVersion(range: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const match = range.match(/^\^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`"${range}" is not a valid caret semver range`);
  }
  const [, major, minor, patch] = match;
  return {major: Number(major), minor: Number(minor), patch: Number(patch)};
}

/** Returns true if `a` denotes a strictly greater version than `b`. */
function isVersionGreater(
  a: {major: number; minor: number; patch: number},
  b: {major: number; minor: number; patch: number},
): boolean {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

describe('root package.json', () => {
  it('parses as valid JSON with the expected shape', async () => {
    const pkg = await readRootPackageJson();
    expect(pkg.name).toBe('adk');
    expect(pkg.devDependencies).toBeTypeOf('object');
  });

  describe('esbuild devDependency', () => {
    it('is declared', async () => {
      const pkg = await readRootPackageJson();
      expect(pkg.devDependencies).toHaveProperty('esbuild');
      expect(typeof pkg.devDependencies.esbuild).toBe('string');
    });

    it('is pinned to the upgraded ^0.28.1 caret range', async () => {
      const pkg = await readRootPackageJson();
      expect(pkg.devDependencies.esbuild).toBe('^0.28.1');
    });

    it('uses a valid caret semver range', async () => {
      const pkg = await readRootPackageJson();
      expect(() =>
        parseCaretVersion(pkg.devDependencies.esbuild),
      ).not.toThrow();
    });

    it('does not regress to the previously pinned ^0.25.9 version', async () => {
      const pkg = await readRootPackageJson();
      const current = parseCaretVersion(pkg.devDependencies.esbuild);
      const previous = {major: 0, minor: 25, patch: 9};

      expect(isVersionGreater(current, previous)).toBe(true);
    });

    it('rejects malformed version strings when checked with the same parser', () => {
      expect(() => parseCaretVersion('0.28.1')).toThrow();
      expect(() => parseCaretVersion('^0.28')).toThrow();
      expect(() => parseCaretVersion('latest')).toThrow();
    });
  });

  describe('surrounding devDependencies', () => {
    it('remain untouched by the esbuild version bump', async () => {
      const pkg = await readRootPackageJson();

      expect(pkg.devDependencies.concurrently).toBe('^9.2.3');
      expect(pkg.devDependencies.eslint).toBe('^9.37.0');
      expect(pkg.devDependencies.globals).toBe('^16.4.0');
      expect(pkg.devDependencies.gts).toBe('^7.0.0');
    });
  });
});