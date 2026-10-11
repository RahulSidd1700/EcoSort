import { CATEGORIES, SAFE_ACTIONS, SELLABLE_CATEGORIES, LOW_CONFIDENCE_THRESHOLD } from '../constants.js';

const CATEGORY_ALIASES = {
  recyclable: 'recyclable',
  recycle: 'recyclable',
  'non-recyclable': 'non_recyclable',
  non_recyclable: 'non_recyclable',
  nonrecyclable: 'non_recyclable',
  'non recyclable': 'non_recyclable',
  general: 'non_recyclable',
  organic: 'organic',
  biodegradable: 'organic',
  compostable: 'organic',
  ewaste: 'ewaste',
  'e-waste': 'ewaste',
  'e waste': 'ewaste',
  electronic: 'ewaste',
  hazardous: 'hazardous',
};

export function normalizeCategory(value) {
  if (typeof value !== 'string') return null;
  const key = value.trim().toLowerCase();
  const mapped = CATEGORY_ALIASES[key] || key;
  return CATEGORIES.includes(mapped) ? mapped : null;
}

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function parseJson(text) {
  const cleaned = text
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  return JSON.parse(cleaned);
}

/**
 * Validates and normalises the raw AI output into EcoSort's fixed structure.
 * Unknown categories are rejected so arbitrary category names never reach the app.
 */
export function normalizeAiResult(rawText) {
  let raw;
  try {
    raw = typeof rawText === 'string' ? parseJson(rawText) : rawText;
  } catch {
    throw new Error('AI response was not valid JSON.');
  }

  const category = normalizeCategory(raw?.category);
  if (!category) throw new Error(`AI returned an unsupported category: ${raw?.category}`);

  let confidence = Number(raw.confidence);
  if (!Number.isFinite(confidence)) confidence = 0;
  if (confidence > 1) confidence = confidence / 100; // model answered as a percentage
  confidence = Math.min(1, Math.max(0, confidence));

  const sellable = SELLABLE_CATEGORIES.includes(category);
  let estimatedValueRange = null;
  const range = raw.estimatedValueRange;
  if (sellable && range && Number.isFinite(Number(range.min)) && Number.isFinite(Number(range.max))) {
    const min = Math.max(0, Math.round(Number(range.min)));
    const max = Math.max(min, Math.round(Number(range.max)));
    if (max > 0) estimatedValueRange = { min, max };
  }

  // Hazardous items always get the fixed safe advice, never free-form AI text.
  const aiAction = cleanText(raw.recommendedAction, 400);
  const recommendedAction = category === 'hazardous' || !aiAction ? SAFE_ACTIONS[category] : aiAction;

  return {
    itemName: cleanText(raw.itemName, 80) || 'Unknown item',
    category,
    confidence: Math.round(confidence * 100) / 100,
    lowConfidence: confidence < LOW_CONFIDENCE_THRESHOLD,
    description: cleanText(raw.description, 400),
    recommendedAction,
    recyclable: category === 'recyclable' || category === 'ewaste',
    estimatedValueRange,
  };
}
