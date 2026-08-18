/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {logger} from '../utils/logger.js';

import {ApigeeLlm} from './apigee_llm.js';
import {BaseLlm} from './base_llm.js';
import {Gemini} from './google_llm.js';

/**
 * type[BaseLlm] equivalent in TypeScript, represents a class that can be new-ed
 * to create a BaseLlm instance.
 */
export type BaseLlmType = (new (params: {model: string}) => BaseLlm) & {
  readonly supportedModels: Array<string | RegExp>;
};

/**
 * A simple LRU cache.
 */
// TODO - b/425992518: consider remove this. model resolution is not frequent.
class LRUCache<K, V> {
  private readonly maxSize: number;
  private cache: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item) {
      // Map maintians insertion order.
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.cache.keys().next().value;
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
      }
    }
    this.cache.set(key, value);
  }
}

/**
 * Registry for LLMs.
 */
export class LLMRegistry {
  /**
   * Key is the regex that matches the model name.
   * Value is an object with the class that implements the model and the compiled fullmatch RegExp.
   */
  private static llmRegistryDict: Map<
    string | RegExp,
    {llmClass: BaseLlmType; compiledPattern: RegExp}
  > = new Map();
  private static resolveCache = new LRUCache<string, BaseLlmType>(32);

  /**
   * Creates a new LLM instance.
   * @param model The model name.
   * @returns The LLM instance.
   */
  static newLlm(model: string): BaseLlm {
    return new (LLMRegistry.resolve(model))({model});
  }

  private static _register(
    modelNameRegex: string | RegExp,
    llmCls: BaseLlmType,
  ) {
    if (LLMRegistry.llmRegistryDict.has(modelNameRegex)) {
      logger.info(
        `Updating LLM class for ${modelNameRegex} from ${LLMRegistry.llmRegistryDict.get(modelNameRegex)?.llmClass} to ${llmCls}`,
      );
    }
    // Pre-compile and cache the fullmatch RegExp anchored with ^ and $
    // to avoid re-compiling RegExp objects on every resolve cache miss.
    const compiledPattern = new RegExp(
      `^${modelNameRegex instanceof RegExp ? modelNameRegex.source : modelNameRegex}$`,
      modelNameRegex instanceof RegExp ? modelNameRegex.flags : undefined,
    );
    LLMRegistry.llmRegistryDict.set(modelNameRegex, {
      llmClass: llmCls,
      compiledPattern,
    });
  }

  /**
   * Registers a new LLM class.
   * @param llmCls The class that implements the model.
   */
  static register<T extends BaseLlm>(
    llmCls: (new (params: {model: string}) => T) & {
      readonly supportedModels: Array<string | RegExp>;
    },
  ) {
    for (const regex of llmCls.supportedModels) {
      LLMRegistry._register(regex, llmCls);
    }
  }

  /**
   * Resolves the model to a BaseLlm subclass.
   * @param model The model name.
   * @returns The BaseLlm subclass.
   * @throws If the model is not found.
   */
  static resolve(model: string): BaseLlmType {
    const cachedLlm = LLMRegistry.resolveCache.get(model);
    if (cachedLlm) {
      return cachedLlm;
    }

    for (const {llmClass, compiledPattern} of LLMRegistry.llmRegistryDict.values()) {
      // Reset lastIndex defensively in case the RegExp has global or sticky flags
      compiledPattern.lastIndex = 0;
      if (compiledPattern.test(model)) {
        LLMRegistry.resolveCache.set(model, llmClass);
        return llmClass;
      }
    }

    throw new Error(`Model ${model} not found.`);
  }
}

/** Registers default LLM factories, e.g. for Gemini models. */
LLMRegistry.register(Gemini);
LLMRegistry.register(ApigeeLlm);
