import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAiResult, normalizeCategory } from '../src/ai/normalize.js';

test('maps category aliases to the five allowed categories', () => {
  assert.equal(normalizeCategory('E-Waste'), 'ewaste');
  assert.equal(normalizeCategory('Non-Recyclable'), 'non_recyclable');
  assert.equal(normalizeCategory('biodegradable'), 'organic');
  assert.equal(normalizeCategory('plastic'), null);
});

test('normalises a valid e-waste response', () => {
  const r = normalizeAiResult(
    JSON.stringify({
      itemName: 'Mobile Phone',
      category: 'ewaste',
      confidence: 94,
      description: 'Electronic device',
      recommendedAction: 'Recycle via authorised e-waste collector.',
      recyclable: true,
      estimatedValueRange: { min: 500, max: 2000 },
    }),
  );
  assert.equal(r.category, 'ewaste');
  assert.equal(r.confidence, 0.94);
  assert.equal(r.lowConfidence, false);
  assert.deepEqual(r.estimatedValueRange, { min: 500, max: 2000 });
});

test('hazardous items always get the safe fixed advice and no value', () => {
  const r = normalizeAiResult('```json\n{"itemName":"Paint can","category":"hazardous","confidence":0.4,"recommendedAction":"Burn it","estimatedValueRange":{"min":10,"max":20}}\n```');
  assert.equal(r.category, 'hazardous');
  assert.ok(!r.recommendedAction.includes('Burn it'));
  assert.equal(r.estimatedValueRange, null);
  assert.equal(r.lowConfidence, true);
});

test('rejects unsupported categories and invalid JSON', () => {
  assert.throws(() => normalizeAiResult('{"category":"plastic"}'));
  assert.throws(() => normalizeAiResult('not json'));
});
