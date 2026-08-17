// app/api/compare/__tests__/route.test.ts
// Tests for the compare API route
import { describe, it, expect, vi, beforeEach } from 'vitest';
// These imports are for type checking only and are unused in runtime
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { NextRequest, NextResponse } from 'next/server';
import type { Request } from 'node:http';

// Mock the orchestrator FIRST, before importing anything that uses it
vi.mock('../../../../lib/ai/orchestrator', () => ({
  comparisonOrchestrator: {
    compare: vi.fn()
  }
}));

// Now import the modules
import { comparisonOrchestrator } from '../../../../lib/ai/orchestrator';
import type { AIResponse, ModelId, ProviderId } from '../../../../lib/ai/types';
import { POST, GET, PUT, DELETE, PATCH, HEAD, OPTIONS } from '../route';

describe('POST /api/compare', () => {
  const mockRequest = (body: Record<string, unknown>) => {
    return {
      json: async () => body
    } as unknown as NextRequest;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 with valid request', async () => {
    const mockResults: AIResponse[] = [
      {
        providerId: 'openrouter' as ProviderId,
        modelId: 'deepseek-ai/deepseek-v4-pro' as ModelId,
        content: 'Test response',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        latencyMs: 100,
        estimatedCost: 0.001,
        finishReason: 'stop'
      }
    ];

    (comparisonOrchestrator.compare as jest.Mock).mockResolvedValue(mockResults);

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
    const mockResults: AIResponse[] = [
      {
        providerId: 'openrouter' as ProviderId,
        modelId: 'deepseek-ai/deepseek-v4-pro' as ModelId,
        content: 'Response 1'
      },
      {
        providerId: 'openrouter' as ProviderId,
        modelId: 'google/gemma-4-31b-it' as ModelId,
        content: 'Response 2'
      }
    ];

    (comparisonOrchestrator.compare as jest.Mock).mockResolvedValue(mockResults);

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
    const mockResults: AIResponse[] = [
      {
        providerId: 'openrouter' as ProviderId,
        modelId: 'deepseek-ai/deepseek-v4-pro' as ModelId,
        content: 'Successful response',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        latencyMs: 100,
        estimatedCost: 0.001,
        finishReason: 'stop'
      },
      {
        providerId: 'openrouter' as ProviderId,
        modelId: 'google/gemma-4-31b-it' as ModelId,
        content: undefined,
        usage: undefined,
        latencyMs: 0,
        estimatedCost: undefined,
        finishReason: undefined,
        error: 'Provider error: Rate limit exceeded'
      }
    ];

    (comparisonOrchestrator.compare as jest.Mock).mockResolvedValue(mockResults);

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
    (comparisonOrchestrator.compare as jest.Mock).mockRejectedValue(
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
  it('should return 405 for GET request', async () => {
    const request = {
      method: 'GET',
      url: 'http://localhost:3000/api/compare'
    } as unknown as Request;

    const response = await GET(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for PUT request', async () => {
    const request = {
      method: 'PUT',
      url: 'http://localhost:3000/api/compare'
    } as unknown as Request;

    const response = await PUT(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for DELETE request', async () => {
    const request = {
      method: 'DELETE',
      url: 'http://localhost:3000/api/compare'
    } as unknown as Request;

    const response = await DELETE(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for PATCH request', async () => {
    const request = {
      method: 'PATCH',
      url: 'http://localhost:3000/api/compare'
    } as unknown as Request;

    const response = await PATCH(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for HEAD request', async () => {
    const request = {
      method: 'HEAD',
      url: 'http://localhost:3000/api/compare'
    } as unknown as Request;

    const response = await HEAD(request);
    expect(response.status).toBe(405);
  });

  it('should return 405 for OPTIONS request', async () => {
    const request = {
      method: 'OPTIONS',
      url: 'http://localhost:3000/api/compare'
    } as unknown as Request;

    const response = await OPTIONS(request);
    expect(response.status).toBe(405);
  });
});