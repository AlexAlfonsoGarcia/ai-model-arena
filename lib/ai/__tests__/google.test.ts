// lib/ai/__tests__/google.test.ts
// Following the exact pattern from openai.provider.test.ts and anthropic.test.ts that was shown to work

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({
    models: {
      generateContent: mockGenerateContent
    }
  })),
  __esModule: true
}));

// Import after mocking
import { GoogleProvider } from "../providers/google";
import { AIError } from "../types";

describe("GoogleProvider", () => {
  const API_KEY = "test-google-key";
  const MODEL_ID = "google/gemini-pro" as const;
  const PROMPT = "Hello, world!";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  describe("successful responses", () => {
    test("returns successful response with default parameters", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: "Hello back!" }
              ]
            },
            finishReason: "STOP"
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const provider = new GoogleProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      // Verify that the Google SDK was called with the correct parameters
      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "google/gemini-pro",
        contents: "Hello, world!",
        // Note: maxOutputTokens is not set by default (we use 1024 in Anthropic, but Gemini may have different default)
        // We are not setting any options, so we don't expect any of the optional parameters
      });

      expect(result).toEqual({
        providerId: "google",
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

    test("passes request options temperature, topP, maxTokens, stop", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: "Hello back!" }
              ]
            },
            finishReason: "STOP"
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const provider = new GoogleProvider();
      await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
        options: {
          temperature: 0.7,
          topP: 0.9,
          maxTokens: 100,
          stop: ["STOP_SEQUENCE"]
        },
      });

      expect(mockGenerateContent).toHaveBeenCalledWith({
        model: "google/gemini-pro",
        contents: "Hello, world!",
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 100,
        stopSequences: ["STOP_SEQUENCE"]
      });
    });
  });

  describe("error handling", () => {
    test("throws AIError when GOOGLE_GENERATIVE_AI_API_KEY is missing", async () => {
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const provider = new GoogleProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: "GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set",
          code: "MISSING_API_KEY",
        } as AIError)
      );
    });

    test("throws AIError for Google API error", async () => {
      const mockError = new Error("Invalid API key");
      (mockError as { code?: string }).code = "INVALID_ARGUMENT";

      mockGenerateContent.mockRejectedValueOnce(mockError);

      const provider = new GoogleProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Google Gemini API error: Invalid API key"),
          code: "INVALID_ARGUMENT",
        } as AIError)
      );
    });

    test("throws AIError for network/fetch failure (simulated by rejected promise)", async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error("Network error"));

      const provider = new GoogleProvider();

      await expect(
        provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        })
      ).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Google Gemini API error: Network error"),
          code: "UNKNOWN_ERROR",
        } as AIError)
      );
    });
  });

  describe("finish reason mapping", () => {
    const testCases: Array<{ reason: string; expected: import("../types").FinishReason | null | undefined }> = [
      { reason: "STOP", expected: "stop" },
      { reason: "MAX_TOKENS", expected: "length" },
      { reason: "SAFETY", expected: "content_filter" },
      { reason: "RECITATION", expected: "content_filter" },
      { reason: "OTHER", expected: "fault" },
      { reason: "unknown", expected: "fault" }, // maps to Fault
    ];

    test.each(testCases)(
      "maps finish reason '$reason' to $expected",
      async ({ reason, expected }) => {
        const mockResponse = {
          candidates: [
            {
              content: {
                parts: [
                  { text: "Hello back!" }
                ]
              },
              finishReason: reason
            }
          ],
          usageMetadata: {
            promptTokenCount: 10,
            candidatesTokenCount: 5,
            totalTokenCount: 15
          }
        };

        mockGenerateContent.mockResolvedValueOnce(mockResponse);

        const provider = new GoogleProvider();
        const result = await provider.generateResponse({
          prompt: PROMPT,
          modelId: MODEL_ID,
        });

        expect(result.finishReason).toBe(expected);
      }
    );
  });

  describe("missing optional fields", () => {
    test("handles missing usageMetadata", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                { text: "Hello back!" }
              ]
            },
            finishReason: "STOP"
          }
        ],
        // usageMetadata is missing
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const provider = new GoogleProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: "google",
        modelId: MODEL_ID,
        content: "Hello back!",
        usage: undefined,
        finishReason: "stop",
      });
    });

    test("handles empty content parts", async () => {
      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [] // empty content
            },
            finishReason: "STOP"
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const provider = new GoogleProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: "google",
        modelId: MODEL_ID,
        content: undefined, // No text part found
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
        finishReason: "stop",
      });
    });

    test("handles missing candidates", async () => {
      const mockResponse = {
        // candidates is missing
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 5,
          totalTokenCount: 15
        }
      };

      mockGenerateContent.mockResolvedValueOnce(mockResponse);

      const provider = new GoogleProvider();
      const result = await provider.generateResponse({
        prompt: PROMPT,
        modelId: MODEL_ID,
      });

      expect(result).toEqual({
        providerId: "google",
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