// app/api/compare/__tests__/route.test.ts
// Tests for the compare API route
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the orchestrator and catalog FIRST, before importing anything that uses them
vi.mock('../../../../lib/ai/orchestrator', () => ({
  comparisonOrchestrator: {
    compare: vi.fn()
  }
}));
vi.mock('../../../../lib/ai/catalog', () => ({
  getModelById: (modelId) => {
    // Valid model IDs that exist in the actual catalog
    const validModels = [
      'deepseek-ai/deepseek-v4-pro',
      'google/gemma-4-31b-it',
      'meta/llama-3.3-70b-instruct',
      'mistralai/mistral-large-2-instruct',
      'openai/gpt-4o-2024-05-13',
      'anthropic/claude-3-opus-20240229',
      'openai/gpt-4-turbo',
      'openai/gpt-3.5-turbo'
    ];
    if (validModels.includes(modelId)) {
      return {
        id: modelId,
        name: modelId,
        provider: 'openrouter'
      };
    }
    return undefined; // Unknown model
  }
}));

// These imports are for type checking only and are unused in runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { NextRequest, NextResponse } from 'next/server';
import type { Request } from 'node:http';

// Import the module once for the basic tests
import { comparisonOrchestrator } from '../../../../lib/ai/orchestrator';
import type { AIResponse, ModelId, ProviderId } from '../../../../lib/ai/types';
import { POST } from '../route';

describe('POST /api/compare', () => {
  const mockRequest = (body: Record<string, unknown>) => {
    return {
      json: async () => body
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    (comparisonOrchestrator.compare as vi.Mock).mockClear();
  });

  it('should return 200 with valid request', async () => {
    const mockResults: AIResponse[] = [{
      providerId: 'openrouter' as ProviderId,
      modelId: 'deepseek-ai/deepseek-v4-pro' as ModelId,
      content: 'Test response',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      latencyMs: 100,
      estimatedCost: 0.001,
      finishReason: 'stop'
    }];

    (comparisonOrchestrator.compare as vi.Mock).mockResolvedValue(mockResults);

    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ results: mockResults });
    expect(comparisonOrchestrator.compare).toHaveBeenCalledWith([
      { prompt: 'Test prompt', modelId: 'deepseek-ai/deepseek-v4-pro' }
    ]);
  });

  it('should handle multiple model IDs', async () => {
    const mockResults: AIResponse[] = [{
      providerId: 'openrouter' as ProviderId,
      modelId: 'deepseek-ai/deepseek-v4-pro' as ModelId,
      content: 'Response 1'
    }, {
      providerId: 'openrouter' as ProviderId,
      modelId: 'google/gemma-4-31b-it' as ModelId,
      content: 'Response 2'
    }];

    (comparisonOrchestrator.compare as vi.Mock).mockResolvedValue(mockResults);

    const request = mockRequest({
      prompt: 'Same prompt for both',
      modelIds: [
        'deepseek-ai/deepseek-v4-pro',
        'google/gemma-4-31b-it'
      ]
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.results).toHaveLength(2);
    expect(comparisonOrchestrator.compare).toHaveBeenCalledWith([
      { prompt: 'Same prompt for both', modelId: 'deepseek-ai/deepseek-v4-pro' },
      { prompt: 'Same prompt for both', modelId: 'google/gemma-4-31b-it' }
    ]);
  });

  it('should return 400 for missing prompt', async () => {
    const request = mockRequest({
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Missing required field: prompt');
  });

  it('should return 400 for empty prompt', async () => {
    const request = mockRequest({
      prompt: '',
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Field "prompt" must not be empty');
  });

  it('should return 400 for prompt over 10,000 characters', async () => {
    const longPrompt = 'x'.repeat(10001);
    const request = mockRequest({
      prompt: longPrompt,
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Field "prompt" must not exceed 10,000 characters');
  });

  it('should return 400 for missing modelIds', async () => {
    const request = mockRequest({
      prompt: 'Test prompt'
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Missing required field: modelIds');
  });

  it('should return 400 for empty modelIds array', async () => {
    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: []
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Field "modelIds" must contain at least one model ID');
  });

  it('should return 400 for more than 3 model IDs', async () => {
    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: [
        'deepseek-ai/deepseek-v4-pro',
        'google/gemma-4-31b-it',
        'meta/llama-3.3-70b-instruct',
        'mistralai/mistral-large-2-instruct'
      ]
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Field "modelIds" must not contain more than 3 model IDs');
  });

  it('should return 400 for non-string modelId', async () => {
    // @ts-expect-error - intentionally passing wrong type for test
    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['deepseek-ai/deepseek-v4-pro', 123 as unknown as string]
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Each model ID must be a string');
  });

  it('should return 400 for unknown model ID', async () => {
    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['unknown/model']
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Unknown model ID: unknown/model');
  });

  it('should return 400 for invalid JSON', async () => {
    // Create a mock request that throws on json()
    const invalidRequest = {
      json: async () => {
        throw new Error('Invalid JSON');
      }
    };

    const response = await POST(invalidRequest);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid JSON in request body');
  });

  it('should return 200 even with partial provider failures', async () => {
    const mockResults: AIResponse[] = [{
      providerId: 'openrouter' as ProviderId,
      modelId: 'deepseek-ai/deepseek-v4-pro' as ModelId,
      content: 'Successful response',
      usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
      latencyMs: 100,
      estimatedCost: 0.001,
      finishReason: 'stop'
    }, {
      providerId: 'openrouter' as ProviderId,
      modelId: 'google/gemma-4-31b-it' as ModelId,
      content: undefined,
      usage: undefined,
      latencyMs: 0,
      estimatedCost: undefined,
      finishReason: undefined,
      error: 'Provider error: Rate limit exceeded'
    }];

    (comparisonOrchestrator.compare as vi.Mock).mockResolvedValue(mockResults);

    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: [
        'deepseek-ai/deepseek-v4-pro',
        'google/gemma-4-31b-it'
      ]
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.results).toHaveLength(2);
    expect(json.results[0].content).toBe('Successful response');
    expect(json.results[1].error).toBe('Provider error: Rate limit exceeded');
  });

  it('should return 500 for unexpected orchestrator failure', async () => {
    (comparisonOrchestrator.compare as vi.Mock).mockRejectedValue(
      new Error('Unexpected error')
    );

    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error).toBe('Internal server error');
  });
});

describe('HTTP Method Handling', () => {
  let routeModule: typeof import('../route');

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the module to get fresh state for each test
    vi.resetModules();

    // Re-mock after reset
    vi.mock('../../../../lib/ai/orchestrator', () => ({
      comparisonOrchestrator: {
        compare: vi.fn()
      }
    }));

    vi.mock('../../../../lib/ai/catalog', () => ({
      getModelById: (modelId) => {
        // Valid model IDs that exist in the actual catalog
        const validModels = [
          'deepseek-ai/deepseek-v4-pro',
          'google/gemma-4-31b-it',
          'meta/llama-3.3-70b-instruct',
          'mistralai/mistral-large-2-instruct',
          'openai/gpt-4o-2024-05-13',
          'anthropic/claude-3-opus-20240229',
          'openai/gpt-4-turbo',
          'openai/gpt-3.5-turbo'
        ];
        if (validModels.includes(modelId)) {
          return {
            id: modelId,
            name: modelId,
            provider: 'openrouter'
          };
        }
        return undefined; // Unknown model
      }
    }));

    // Fresh import after resetting modules and setting up mocks
    routeModule = await import('../route');
  });

  it('should return 405 for GET request', async () => {
    const { GET: testGet } = routeModule;
    const request: Request = {
      method: 'GET',
      url: 'http://localhost:3000/api/compare'
    };

    const response = await testGet(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for PUT request', async () => {
    const { PUT: testPut } = routeModule;
    const request: Request = {
      method: 'PUT',
      url: 'http://localhost:3000/api/compare'
    };

    const response = await testPut(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for DELETE request', async () => {
    const { DELETE: testDelete } = routeModule;
    const request: Request = {
      method: 'DELETE',
      url: 'http://localhost:3000/api/compare'
    };

    const response = await testDelete(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for PATCH request', async () => {
    const { PATCH: testPatch } = routeModule;
    const request: Request = {
      method: 'PATCH',
      url: 'http://localhost:3000/api/compare'
    };

    const response = await testPatch(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for HEAD request', async () => {
    const { HEAD: testHead } = routeModule;
    const request: Request = {
      method: 'HEAD',
      url: 'http://localhost:3000/api/compare'
    };

    const response = await testHead(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for OPTIONS request', async () => {
    const { OPTIONS: testOptions } = routeModule;
    const request: Request = {
      method: 'OPTIONS',
      url: 'http://localhost:3000/api/compare'
    };

    const response = await testOptions(request);
    expect(response.status).toBe(405);
  });
});

describe('Security Features', () => {
  const mockRequest = (body: Record<string, unknown>, ip = '127.0.0.1') => {
    return {
      json: async () => body,
      headers: {
        get: (key: string) => {
          if (key === 'x-forwarded-for') return ip;
          return null;
        }
      }
    } as unknown as NextRequest;
  };

  let routeModule: typeof import('../route');
  let orchestratorMock: ReturnType<typeof vi.fn>;
  let catalogMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the module to get fresh state for each test
    vi.resetModules();

    // Import and mock the orchestrator
    const orchestratorModule = await import('../../../../lib/ai/orchestrator');
    orchestratorMock = vi.mocked(orchestratorModule.comparisonOrchestrator);
    orchestratorMock.compare = vi.fn().mockResolvedValue([{
      providerId: 'openrouter' as ProviderId,
      modelId: 'deepseek-ai/deepseek-v4-pro' as ModelId,
      content: 'Test response'
    }]);

    // Import and mock the catalog
    const catalogModule = await import('../../../../lib/ai/catalog');
    catalogMock = vi.mocked(catalogModule);
    catalogMock.getModelById = vi.fn((modelId: string) => {
      // Valid model IDs that exist in the actual catalog
      const validModels = [
        'deepseek-ai/deepseek-v4-pro',
        'google/gemma-4-31b-it',
        'meta/llama-3.3-70b-instruct',
        'mistralai/mistral-large-2-instruct',
        'openai/gpt-4o-2024-05-13',
        'anthropic/claude-3-opus-20240229',
        'openai/gpt-4-turbo',
        'openai/gpt-3.5-turbo',
        'model1',
        'model-a',
        'model-b',
        'model-c'
      ];
      if (validModels.includes(modelId)) {
        return {
          id: modelId,
          name: modelId,
          provider: 'openrouter'
        };
      }
      return undefined; // Unknown model
    });

    // Fresh import after resetting modules and setting up mocks
    routeModule = await import('../route');
  });

  it('should enforce weighted rate limiting (1 model = 1 unit)', async () => {
    const { POST: testPost } = routeModule;

    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    }, '192.168.1.1');

    // Make 10 requests (should all succeed)
    for (let i = 0; i < 10; i++) {
      const response = await testPost(request);
      expect(response.status).toBe(200);
    }

    // 11th request should fail
    const response = await testPost(request);
    expect(response.status).toBe(429);
  });

  it('should apply different costs for different model counts', async () => {
    const { POST: testPost } = routeModule;

    const request1Model = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['model1']
    }, '192.168.1.2');

    const request3Model = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['model-a', 'model-b', 'model-c']
    }, '192.168.1.2');

    // With limit of 10 units:
    // We can make 3 three-model requests (3*3=9 units)
    // Then 1 more single-model request (1 unit) = 10 units total
    // Next request should fail

    // Make 3 three-model requests
    for (let i = 0; i < 3; i++) {
      const response = await testPost(request3Model);
      expect(response.status).toBe(200);
    }

    // Make 1 single-model request (should bring us to exactly 10 units)
    const singleModelResponse = await testPost(request1Model);
    expect(singleModelResponse.status).toBe(200);

    // Next request should fail (would exceed limit)
    const threeModelResponse = await testPost(request3Model);
    expect(threeModelResponse.status).toBe(429);
  });

  it('should maintain independent rate limits for different IPs', async () => {
    const { POST: testPost }: { POST: typeof import('../route')['POST'] } = routeModule;

    // IP A uses up its limit
    const ipARequest = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    }, '10.0.0.1');

    for (let i = 0; i < 10; i++) {
      const response = await testPost(ipARequest);
      expect(response.status).toBe(200);
    }

    // IP A should be rate limited
    const ipAResponse = await testPost(ipARequest);
    expect(ipAResponse.status).toBe(429);

    // IP B should still work
    const ipBRequest = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    }, '10.0.0.2');

    const ipBResponse = await testPost(ipBRequest);
    expect(ipBResponse.status).toBe(200);
  });

  it('should reset rate limit after time window expires', async () => {
    const { POST: testPost } = routeModule;

    vi.useFakeTimers();

    const request = mockRequest({
      prompt: 'Test prompt',
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    }, '192.168.1.3');

    // Set initial time
    const now = Date.now();
    vi.setSystemTime(now);

    // Use up the limit
    for (let i = 0; i < 10; i++) {
      const response = await testPost(request);
      expect(response.status).toBe(200);
    }

    // Should be rate limited now
    let response = await testPost(request);
    expect(response.status).toBe(429);

    // Advance time beyond the window (61 seconds)
    vi.advanceTimersByTime(61000);

    // Should be able to make requests again
    response = await testPost(request);
    expect(response.status).toBe(200);

    vi.useRealTimers();
  });

  it('should not consume rate limit for invalid requests', async () => {
    const { POST: testPost } = routeModule;

    const ip = '192.168.1.4';

    // Send many invalid requests (should not consume quota)
    const invalidRequests = [
      {}, // missing prompt and modelIds
      { prompt: '' }, // empty prompt
      { prompt: 'test', modelIds: [] }, // empty modelIds
      { prompt: 'test', modelIds: ['m1', 'm2', 'm3', 'm4'] }, // too many modelIds
      { prompt: 'test', modelIds: [123] }, // non-string modelId
      { prompt: 'test', modelIds: ['unknown/model'] }, // unknown modelId
    ];

    for (const invalidBody of invalidRequests) {
      const invalidRequest = mockRequest(invalidBody, ip);
      const response = await testPost(invalidRequest);
      expect(response.status).toBe(400); // Validation error, not rate limit
    }

    // Now a valid request should work (not rate limited)
    const validRequest = mockRequest({
      prompt: 'Valid prompt',
      modelIds: ['deepseek-ai/deepseek-v4-pro']
    }, ip);

    const response = await testPost(validRequest);
    expect(response.status).toBe(200);
  });
});