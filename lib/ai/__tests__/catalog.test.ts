// lib/ai/__tests__/catalog.test.ts
import { modelCatalog, getModelById, getOpenRouterModelName } from '../catalog';

describe('Model Catalog', () => {
  const expectedModels = [
    '01-ai/yi-large',
    'deepseek-ai/deepseek-v4-pro',
    'deepseek-ai/deepseek-v4-flash',
    'google/gemma-4-31b-it',
    'meta/llama-3.3-70b-instruct',
    'mistralai/mistral-large-2-instruct',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'moonshotai/kimi-k2.6',
    'nvidia/llama-3.3-nemotron-super-49b-v1.5',
    'anthropic/claude-3-opus-20240229',
    'anthropic/claude-3-sonnet-20240229',
    'anthropic/claude-3-haiku-20240307',
    'google/gemini-1.5-pro',
    'google/gemini-1.5-flash',
    'google/gemini-pro',
    'openai/gpt-3.5-turbo',
  ];

  test('catalog contains all expected models', () => {
    const ids = modelCatalog.map(m => m.id);
    expect(ids).toEqual(expect.arrayContaining(expectedModels));
    expect(ids.length).toBe(expectedModels.length);
  });

  test('each model has correct organization and at least one route', () => {
    for (const model of modelCatalog) {
      expect(model.organization).toBeDefined();
      expect(model.organization.length).toBeGreaterThan(0);
      expect(model.routes).toBeInstanceOf(Array);
      expect(model.routes.length).toBeGreaterThan(0);
      // Ensure capabilities and modalities are arrays
      expect(Array.isArray(model.capabilities)).toBe(true);
      expect(Array.isArray(model.modalities)).toBe(true);
      // For MVP, we only expect text capability and modality; but we can just check they exist
      // Since we left some fields undefined, we don't assert on them.
    }
  });

  test('getModelById returns correct model', () => {
    const model = getModelById('deepseek-ai/deepseek-v4-pro');
    expect(model).toBeDefined();
    expect(model?.id).toBe('deepseek-ai/deepseek-v4-pro');
    expect(model?.organization).toBe('deepseek-ai');
  });

  test('getModelById returns undefined for unknown id', () => {
    expect(getModelById('unknown/unknown')).toBeUndefined();
  });

  test('getOpenRouterModelName returns model id when no modelName override', () => {
    // For our catalog we didn't set modelName, so fallback to id
    const modelName = getOpenRouterModelName('01-ai/yi-large');
    expect(modelName).toBe('01-ai/yi-large');
  });

  test('getOpenRouterModelName returns undefined for unknown model', () => {
    expect(getOpenRouterModelName('unknown/unknown')).toBeUndefined();
  });

  test('models have valid pricing structure when present', () => {
    const modelsWithPricing = modelCatalog.filter(model => model.pricing !== undefined);
    expect(modelsWithPricing.length).toBeGreaterThan(0);

    for (const model of modelsWithPricing) {
      expect(model.pricing).toBeDefined();
      expect(model.pricing.inputPerMillionTokens).toBeGreaterThanOrEqual(0);
      expect(model.pricing.outputPerMillionTokens).toBeGreaterThanOrEqual(0);
      expect(typeof model.pricing.inputPerMillionTokens).toBe('number');
      expect(typeof model.pricing.outputPerMillionTokens).toBe('number');
      expect(!isNaN(model.pricing.inputPerMillionTokens)).toBe(true);
      expect(!isNaN(model.pricing.outputPerMillionTokens)).toBe(true);
      expect(!isFinite(model.pricing.inputPerMillionTokens)).toBe(false);
      expect(!isFinite(model.pricing.outputPerMillionTokens)).toBe(false);
    }
  });
});