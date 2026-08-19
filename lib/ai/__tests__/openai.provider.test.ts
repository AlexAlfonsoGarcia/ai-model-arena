// lib/ai/__tests__/openai.test.ts
// Following the exact pattern from openai.working.test.ts that was shown to work

const mockCreate = vi.fn();
vi.mock('openai', () => ({
  OpenAI: vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreate
      }
    }
  })),
  __esModule: true
}));

import { OpenAIProvider } from '../providers/openai';
import { AIError } from '../types';

describe('OpenAIProvider', () => {
  const API_KEY = 'test-openai-key';
  const MODEL_ID = 'openai/gpt-oss-120b' as const;
  const PROMPT = 'Hello, world!';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  describe('successful responses', () => {
    test('returns successful response with default parameters', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Hello back!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const provider = new OpenAIProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      // Verify that the OpenAI SDK was called with the correct parameters
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: PROMPT }],
      });

      expect(result).toEqual({
        providerId: 'openai',
        modelId: MODEL_ID,
        content: 'Hello back!',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: 'stop',
      });
    });

    test('passes request options temperature, topP, maxTokens', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Hello back!' },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          totalTokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const provider = new OpenAIProvider();
      await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
        options: {
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 100,
        },
      });

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: PROMPT }],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 100,
      });
    });
  });

  describe('error handling', () => {
    test('throws AIError when OPENAI_API_KEY is missing', async () => {
      delete process.env.OPENAI_API_KEY;
      const provider = new OpenAIProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: 'OPENAI_API_KEY environment variable is not set',
          code: 'MISSING_API_KEY',
        } as AIError)
      );
    });

    test('throws AIError for OpenAI API error', async () => {
      const mockError = new Error('Invalid API key');
      (mockError as { code?: string; type?: string }).code = 'invalid_api_key';
      (mockError as { code?: string; type?: string }).type = 'InvalidRequestError';

      mockCreate.mockRejectedValueOnce(mockError);

      const provider = new OpenAIProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining('OpenAI API error: Invalid API key'),
          code: 'invalid_api_key',
        } as AIError)
      );
    });

    test('throws AIError for network/fetch failure (simulated by rejected promise)', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Network error'));

      const provider = new OpenAIProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining('OpenAI API error: Network error'),
          code: 'UNKNOWN_ERROR',
        } as AIError)
      );
    });
  });

  describe('finish reason mapping', () => {
    const testCases: Array<{ reason: string; expected: import('../types').FinishReason | null | undefined }> = [
      { reason: 'stop', expected: 'stop' },
      { reason: 'length', expected: 'length' },
      { reason: 'tool_calls', expected: 'tool_calls' },
      { reason: 'content_filter', expected: 'content_filter' },
      { reason: 'unknown', expected: 'fault' }, // maps to Fault
    ];

    test.each(testCases)(
      'maps finish reason \'$reason\' to $expected',
      async ({ reason, expected }) => {
        const mockResponse = {
          choices: [
            {
              message: { content: 'Hello back!' },
              finish_reason: reason,
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        };

        mockCreate.mockResolvedValueOnce(mockResponse);

        const provider = new OpenAIProvider();
        const result = await provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        });

        expect(result.finishReason).toBe(expected);
      }
    );
  });

  describe('missing optional fields', () => {
    test('handles missing usage', async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: 'Hello back!' },
            finish_reason: 'stop',
          },
        ],
        // usage is missing
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const provider = new OpenAIProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: 'openai',
        modelId: MODEL_ID,
        content: 'Hello back!',
        usage: undefined,
        finishReason: 'stop',
      });
    });

    test('handles empty choices / missing content and finish reason', async () => {
      const mockResponse = {
        choices: [], // empty choices
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const provider = new OpenAIProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: 'openai',
        modelId: MODEL_ID,
        content: undefined,
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: undefined,
      });
    });
  });
});