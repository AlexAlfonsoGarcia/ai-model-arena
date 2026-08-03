// lib/ai/__tests__/registry.test.ts
import { ProviderRegistry } from '../registry';
import { AIProvider, AIResponse, ProviderId, ModelId } from '../types';

// Simple branded type helper for testing
type Brand<T, TBrand extends string> = T & { __brand: TBrand };

// Mock provider implementation
class MockProvider implements AIProvider {
  id: Brand<ProviderId, 'MockProvider'>;
  constructor(id: string) {
    this.id = id as Brand<ProviderId, 'MockProvider'>;
  }
  async generateResponse(_: GenerateRequest): Promise<AIResponse> {
    // Use the parameter to avoid unused variable warning
    if (false) {
      console.log(_);
    }
    return {
      providerId: this.id as ProviderId,
      modelId: 'test-model' as ModelId,
    };
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  test('register and get provider', () => {
    const provider = new MockProvider('test-provider');
    registry.register(provider);
    expect(registry.has(provider.id)).toBe(true);
    const retrieved = registry.get(provider.id);
    expect(retrieved).toBe(provider);
  });

  test('get throws for unknown provider', () => {
    expect(() => registry.get('unknown')).toThrow('Provider not found: unknown');
  });

  test('getProviders returns registered ids', () => {
    const p1 = new MockProvider('p1');
    const p2 = new MockProvider('p2');
    registry.register(p1);
    registry.register(p2);
    const ids = registry.getProviders();
    expect(ids).toContainEqual(expect.stringContaining('p1'));
    expect(ids).toContainEqual(expect.stringContaining('p2'));
    expect(ids.length).toBe(2);
  });

  test('clear removes all providers', () => {
    registry.register(new MockProvider('p1'));
    registry.register(new MockProvider('p2'));
    expect(registry.getProviders().length).toBe(2);
    registry.clear();
    expect(registry.getProviders().length).toBe(0);
    expect(() => registry.get('p1')).toThrow('Provider not found: p1');
  });
});