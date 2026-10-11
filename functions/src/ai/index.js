// AI provider selector. To switch provider/model, change AI_PROVIDER / AI_MODEL
// in functions/.env - no frontend change is needed.
import { CLASSIFICATION_PROMPT } from './prompt.js';
import { classifyWithGemini } from './providers/gemini.js';
import { classifyWithOpenAI } from './providers/openai.js';
import { normalizeAiResult } from './normalize.js';

const PROVIDERS = {
  gemini: { fn: classifyWithGemini, defaultModel: 'gemini-2.5-flash' },
  openai: { fn: classifyWithOpenAI, defaultModel: 'gpt-4o-mini' },
};

export async function classifyWasteImage({ apiKey, buffer, mimeType }) {
  const providerName = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider) throw new Error(`Unknown AI provider: ${providerName}`);
  if (!apiKey) throw new Error('AI API key is not configured.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const rawText = await provider.fn({
      apiKey,
      model: process.env.AI_MODEL || provider.defaultModel,
      prompt: CLASSIFICATION_PROMPT,
      base64Image: buffer.toString('base64'),
      mimeType,
      signal: controller.signal,
    });
    return { ...normalizeAiResult(rawText), provider: providerName };
  } finally {
    clearTimeout(timer);
  }
}
