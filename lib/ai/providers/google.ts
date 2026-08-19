// lib/ai/providers/google.ts
// Google Gemini provider - implements AIProvider interface using official Google GenAI SDK
import { GoogleGenAI } from '@google/genai';
import { AIProvider, GenerateRequest, AIResponse, ProviderId, ModelId, FinishReason, AIError, TokenUsage } from "../types";

export class GoogleProvider implements AIProvider {
  public readonly id: ProviderId = "google" as ProviderId;
  public readonly name: string = "Google Gemini";

  private client: GoogleGenAI | null;

  constructor() {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      // Don't throw here - let the generateResponse method handle missing API key
      // This allows the provider to be instantiated even if the key is missing
      // (useful for testing)
      this.client = null as unknown as GoogleGenAI;
    } else {
      this.client = new GoogleGenAI({ apiKey });
    }
  }

  async generateResponse(request: GenerateRequest): Promise<AIResponse> {
    // Check if client is initialized
    if (!this.client) {
      throw this.createAIError("GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set", "MISSING_API_KEY");
    }

    try {
      // Make the API call to Gemini
      // Note: We are using the text model, so we use generateContent
      const result = await this.client.models.generateContent({
        model: request.modelId,
        contents: request.prompt,
        // Add optional parameters if they exist in request.options
        ...(request.options?.temperature !== undefined && { temperature: request.options.temperature }),
        ...(request.options?.topP !== undefined && { topP: request.options.topP }),
        ...(request.options?.maxTokens !== undefined && { maxOutputTokens: request.options.maxTokens }),
        // Note: stop parameter handling would go here if needed
        // Gemini uses `stopSequences` in the config
        ...(request.options?.stop !== undefined && {
          stopSequences: Array.isArray(request.options.stop) ? request.options.stop : [request.options.stop]
        }),
      });

      // Extract data from Gemini response
      // The response structure: result.candidates[0].content.parts[0].text
      let content: string | undefined = undefined;
      if (result.candidates &&
          Array.isArray(result.candidates) &&
          result.candidates.length > 0) {
        const candidate = result.candidates[0];
        if (candidate.content &&
            candidate.content.parts &&
            Array.isArray(candidate.content.parts) &&
            candidate.content.parts.length > 0) {
          // We assume the first part is text (for text-only models)
          const firstPart = candidate.content.parts[0];
          if ('text' in firstPart && typeof firstPart.text === 'string') {
            content = firstPart.text;
          }
        }
      }

      const finishReason = result.candidates?.[0]?.finishReason ?? undefined;
      const usage = result.usageMetadata;

      // Map Gemini finish reason to our enum
      let mappedFinishReason: FinishReason.Stop | FinishReason.Length | FinishReason.ToolCalls | FinishReason.ContentFilter | FinishReason.Fault | null | undefined;
      if (finishReason) {
        switch (finishReason) {
          case "STOP":
            mappedFinishReason = FinishReason.Stop;
            break;
          case "MAX_TOKENS":
            mappedFinishReason = FinishReason.Length;
            break;
          case "SAFETY":
            // Treat safety as content filter
            mappedFinishReason = FinishReason.ContentFilter;
            break;
          case "RECITATION":
            // Treat recitation as content filter
            mappedFinishReason = FinishReason.ContentFilter;
            break;
          case "OTHER":
            // For any other reason, we map to Fault
            mappedFinishReason = FinishReason.Fault;
            break;
          default:
            // For unknown reason, we map to Fault
            mappedFinishReason = FinishReason.Fault;
            break;
        }
      }

      // Extract usage data
      const tokenUsage: TokenUsage | undefined = usage ? {
        inputTokens: usage.promptTokenCount ?? undefined,
        outputTokens: usage.candidatesTokenCount ?? undefined,
        totalTokens: usage.totalTokenCount ?? undefined
      } : undefined;

      // Map the response to our AIResponse format
      const aiResponse: AIResponse = {
        providerId: this.id,
        modelId: request.modelId as ModelId,
        content: content,
        usage: tokenUsage,
        // Note: We're not calculating latency or cost as per instructions
        // Latency is handled by the orchestrator
        // Cost calculation is handled by the orchestrator if pricing data is available
        finishReason: mappedFinishReason,
      };

      return aiResponse;
    } catch (error) {
      // Handle Google GenAI SDK errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      let errorCode = "UNKNOWN_ERROR";

      // Try to extract more specific error information from Google error
      if (error && typeof error === 'object' && 'code' in error) {
        errorCode = String((error as { code: unknown }).code);
      } else if (error && typeof error === 'object' && 'status' in error) {
        // Google errors often have a status property
        errorCode = String((error as { status: unknown }).status);
      }

      throw this.createAIError(`Google Gemini API error: ${errorMessage}`, errorCode);
    }
  }

  /**
   * Creates a standardized AIError object
   */
  private createAIError(message: string, code?: string): AIError {
    return {
      message,
      ...(code && { code })
    };
  }
}

// Export a singleton instance for convenience
export const googleProvider = new GoogleProvider();