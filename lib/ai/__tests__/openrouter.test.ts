import { OpenRouterProvider } from "../providers/openrouter";
import { AIError } from "../types";
import { getOpenRouterModelName } from "../catalog";

describe("OpenRouterProvider", () => {
  const API_KEY = "test-api-key";
  const MODEL_ID = "deepseek-ai/deepseek-v4-pro" as const;
  const PROMPT = "Hello, world!";
  const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.OPENROUTER_API_KEY = API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENROUTER_API_KEY;
  });

  describe("successful responses", () => {
    test("returns successful response with default parameters", async () => {
      const mockResponse = {
        choices: [
          {
            message: { content: "Hello back!" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      ));

      const provider = new OpenRouterProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(fetch).toHaveBeenCalledWith(BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getOpenRouterModelName(MODEL_ID),
          messages: [{ role: "user", content: PROMPT }],
        }),
      });

      expect(result).toEqual({
        providerId: "openrouter",
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
        choices: [
          {
            message: { content: "Hello back!" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      ));

      const provider = new OpenRouterProvider();
      await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
        options: {
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 100,
        },
      });

      expect(fetch).toHaveBeenCalledWith(BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: getOpenRouterModelName(MODEL_ID),
          messages: [{ role: "user", content: PROMPT }],
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 100,
        }),
      });
    });
  });

  describe("error handling", () => {
    test("throws AIError when OPENROUTER_API_KEY is missing", async () => {
      delete process.env.OPENROUTER_API_KEY;
      const provider = new OpenRouterProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: "OPENROUTER_API_KEY environment variable is not set",
          code: "MISSING_API_KEY",
        } as AIError)
      );
    });

    test("throws AIError for HTTP API error with JSON error body", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          json: () =>
            Promise.resolve({
              error: { message: "Invalid API key", code: 401 },
            }),
        } as Response)
      ));

      const provider = new OpenRouterProvider();
      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: "Invalid API key",
          code: "401",
        } as AIError)
      );
    });

    test("throws AIError for HTTP API error without JSON error body", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
          json: () => Promise.resolve({}), // Empty JSON
        } as Response)
      ));

      const provider = new OpenRouterProvider();
      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: "Internal Server Error",
          code: "HTTP_500",
        } as AIError)
      );
    });

    test("throws AIError for network/fetch failure", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.reject(new Error("Failed to fetch"))
      ));

      const provider = new OpenRouterProvider();
      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Failed to connect to OpenRouter API"),
          code: "NETWORK_ERROR",
        } as AIError)
      );
    });

    test("throws AIError for invalid JSON response", async () => {
      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error("Invalid JSON")),
        } as Response)
      ));

      const provider = new OpenRouterProvider();
      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Invalid JSON response from OpenRouter API"),
          code: "INVALID_RESPONSE",
        } as AIError)
      );
    });
  });

  describe("finish reason mapping", () => {
    const testCases: Array<{ reason: string; expected: FinishReason | null | undefined }> = [
      { reason: "stop", expected: "stop" },
      { reason: "length", expected: "length" },
      { reason: "tool_calls", expected: "tool_calls" },
      { reason: "content_filter", expected: "content_filter" },
      { reason: "unknown_reason", expected: "fault" }, // maps to Fault
    ];

    test.each(testCases)(
      "maps finish reason '$reason' to $expected",
      async ({ reason, expected }) => {
        const mockResponse = {
          choices: [
            {
              message: { content: "Hello back!" },
              finish_reason: reason,
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        };

        vi.stubGlobal("fetch", vi.fn(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockResponse),
          } as Response)
        ));

        const provider = new OpenRouterProvider();
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
        choices: [
          {
            message: { content: "Hello back!" },
            finish_reason: "stop",
          },
        ],
        // usage is missing
      };

      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      ));

      const provider = new OpenRouterProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: "openrouter",
        modelId: MODEL_ID,
        content: "Hello back!",
        usage: undefined,
        finishReason: "stop",
      });
    });

    test("handles empty choices / missing content and finish reason", async () => {
      const mockResponse = {
        choices: [], // empty choices
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      vi.stubGlobal("fetch", vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      ));

      const provider = new OpenRouterProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: "openrouter",
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