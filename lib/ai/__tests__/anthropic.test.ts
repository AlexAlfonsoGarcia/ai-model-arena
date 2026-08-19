// lib/ai/__tests__/anthropic.test.ts
// Following the exact pattern from openai.provider.test.ts that was shown to work

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  Anthropic: vi.fn(() => ({
    messages: {
      create: mockCreate
    }
  })),
  __esModule: true
}));

// Import after mocking
import { AnthropicProvider } from "../providers/anthropic";
import { AIError } from "../types";

describe("AnthropicProvider", () => {
  const API_KEY = "test-anthropic-key";
  const MODEL_ID = "anthropic/claude-3-opus-20240229" as const;
  const PROMPT = "Hello, world!";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe("successful responses", () => {
    test("returns successful response with default parameters", async () => {
      const mockResponse = {
        content: [{ text: "Hello back!" }],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
        stop_reason: "end_turn",
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const provider = new AnthropicProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      // Verify that the Anthropic SDK was called with the correct parameters
      expect(mockCreate).toHaveBeenCalledWith({
        model: "anthropic/claude-3-opus-20240229",
        max_tokens: 1024, // default value
        messages: [{ role: "user", content: PROMPT }],
      });

      expect(result).toEqual({
        providerId: "anthropic",
        modelId: MODEL_ID,
        content: "Hello back!",
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: "stop",
      });
    });

    test("passes request options temperature, topP, maxTokens", async () => {
      const mockResponse = {
        content: [{ text: "Hello back!" }],
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
        stop_reason: "end_turn",
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const provider = new AnthropicProvider();
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
        model: "anthropic/claude-3-opus-20240229",
        max_tokens: 100, // from options
        messages: [{ role: "user", content: PROMPT }],
        temperature: 0.7,
        top_p: 0.9,
      });
    });
  });

  describe("error handling", () => {
    test("throws AIError when ANTHROPIC_API_KEY is missing", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const provider = new AnthropicProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: "ANTHROPIC_API_KEY environment variable is not set",
          code: "MISSING_API_KEY",
        } as AIError)
      );
    });

    test("throws AIError for Anthropic API error", async () => {
      const mockError = new Error("Invalid API key");
      (mockError as { type?: string }).type = "invalid_request_error";

      mockCreate.mockRejectedValueOnce(mockError);

      const provider = new AnthropicProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Anthropic API error: Invalid API key"),
          code: "invalid_request",
        } as AIError)
      );
    });

    test("throws AIError for network/fetch failure (simulated by rejected promise)", async () => {
      mockCreate.mockRejectedValueOnce(new Error("Network error"));

      const provider = new AnthropicProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Anthropic API error: Network error"),
          code: "UNKNOWN_ERROR",
        } as AIError)
      );
    });
  });

  describe("finish reason mapping", () => {
    const testCases: Array<{ reason: string; expected: import("../types").FinishReason | null | undefined }> = [
      { reason: "end_turn", expected: "stop" },
      { reason: "max_tokens", expected: "length" },
      { reason: "stop_sequence", expected: "stop" },
      { reason: "tool_use", expected: "tool_calls" },
      { reason: "refusal", expected: "content_filter" },
      { reason: "unknown", expected: "fault" }, // maps to Fault
    ];

    test.each(testCases)(
      "maps stop reason '$reason' to $expected",
      async ({ reason, expected }) => {
        const mockResponse = {
          content: [{ text: "Hello back!" }],
          usage: {
            input_tokens: 10,
            output_tokens: 5,
          },
          stop_reason: reason,
        };

        mockCreate.mockResolvedValueOnce(mockResponse);

        const provider = new AnthropicProvider();
        const result = await provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        });

        expect(result.finishReason).toBe(expected);
      }
    );
  });

  describe("missing optional fields", () => {
    test("handles missing usage", async () => {
      const mockResponse = {
        content: [{ text: "Hello back!" }],
        // usage is missing
        stop_reason: "end_turn",
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const provider = new AnthropicProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: "anthropic",
        modelId: MODEL_ID,
        content: "Hello back!",
        usage: undefined,
        finishReason: "stop",
      });
    });

    test("handles empty content", async () => {
      const mockResponse = {
        content: [], // empty content
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
        stop_reason: "end_turn",
      };

      mockCreate.mockResolvedValueOnce(mockResponse);

      const provider = new AnthropicProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: "anthropic",
        modelId: MODEL_ID,
        content: undefined,
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: "stop",
      });
    });
  });
});