/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {describe, expect, it} from 'vitest';
import {
  extractModelName,
  isGemini1Model,
  isGemini2OrAbove,
  isGeminiModel,
} from '../../src/utils/model_name.js';

describe('extractModelName', () => {
  it('should return simple model name as-is', () => {
    expect(extractModelName('gemini-2.5-pro')).toBe('gemini-2.5-pro');
    expect(extractModelName('gemini-1.5-flash')).toBe('gemini-1.5-flash');
    expect(extractModelName('custom-model')).toBe('custom-model');
  });

  it('should extract model name from vertex resource path', () => {
    expect(
      extractModelName(
        'projects/my-project/locations/us-central1/publishers/google/models/gemini-2.0-flash-001',
      ),
    ).toBe('gemini-2.0-flash-001');
  });

  it('should handle empty string or falsy input', () => {
    expect(extractModelName('')).toBe('');
  });
});

describe('isGeminiModel', () => {
  it('should return true for Gemini models', () => {
    expect(isGeminiModel('gemini-1.5-pro')).toBe(true);
    expect(isGeminiModel('gemini-2.0-flash')).toBe(true);
    expect(
      isGeminiModel(
        'projects/p/locations/l/publishers/google/models/gemini-2.5-pro',
      ),
    ).toBe(true);
  });

  it('should return false for non-Gemini models', () => {
    expect(isGeminiModel('gpt-4')).toBe(false);
    expect(isGeminiModel('claude-3-5-sonnet')).toBe(false);
    expect(isGeminiModel('')).toBe(false);
  });
});

describe('isGemini1Model', () => {
  it('should return true for Gemini 1.x models', () => {
    expect(isGemini1Model('gemini-1.5-pro')).toBe(true);
    expect(isGemini1Model('gemini-1.0-ultra')).toBe(true);
    expect(
      isGemini1Model(
        'projects/p/locations/l/publishers/google/models/gemini-1.5-flash',
      ),
    ).toBe(true);
  });

  it('should return false for Gemini 2+ or non-Gemini models', () => {
    expect(isGemini1Model('gemini-2.0-flash')).toBe(false);
    expect(isGemini1Model('gpt-4')).toBe(false);
    expect(isGemini1Model('')).toBe(false);
  });
});

describe('isGemini2OrAbove', () => {
  describe('valid models', () => {
    const validModels = [
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemini-3-pro-image-preview',
      'gemini-2.5-pro',
      'gemini-2.5-flash-image',
      'gemini-2.5-flash',
      'gemini-2.5-flash-preview-09-2025',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash-lite-preview-09-2025',
      'gemini-2.0-flash-001',
      'gemini-2.0-flash-lite-001',
    ];

    for (const model of validModels) {
      it(`should return true for model: ${model}`, () => {
        expect(isGemini2OrAbove(model)).toBe(true);
      });
    }
  });

  describe('invalid models', () => {
    const invalidModels = [
      'gemini-live-2.5-flash-native-audio',
      'veo-3.1-generate-001',
      'veo-3.0-fast-generate-001',
      'imagen-4.0-ultra-generate-001',
      'imagen-3.0-generate-001',
      'deepseek-ocr-maas',
      'kimi-k2-thinking-maas',
      'llama-4-scout-17b-16e-instruct-maas',
      'minimax-m2-maas',
      'gpt-oss-120b-maas',
      'qwen3-next-80b-a3b-instruct-maas',
      'gemini-1.5-pro',
      'gemini-1.0-pro',
    ];

    for (const model of invalidModels) {
      it(`should return false for model: ${model}`, () => {
        expect(isGemini2OrAbove(model)).toBe(false);
      });
    }
  });
});
