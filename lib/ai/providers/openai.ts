// lib/ai/providers/openai.ts
// OpenAI provider - implements AIProvider interface using official OpenAI SDK
import { OpenAI } from 'openai';
import { AIProvider, GenerateRequest, AIResponse, ProviderId, ModelId, FinishReason, AIError, TokenUsage } from "../types";

export class OpenAIProvider implements AIProvider {
  public readonly id: ProviderId = "openai" as ProviderId;
  public readonly name: string = "OpenAI";

  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Don't throw here - let the generateResponse method handle missing API key
      // This allows the provider to be instantiated even if the key is missing
      // (useful for testing)
      this.client = null as unknown as OpenAI;
    } else {
      this.client = new OpenAI({ apiKey });
    }
  }

  async generateResponse(request: GenerateRequest): Promise<AIResponse> {
    // Check if client is initialized
    if (!this.client) {
      throw this.createAIError("OPENAI_API_KEY environment variable is not set", "MISSING_API_KEY");
    }

    try {
      // Make the API call to OpenAI
      const completion = await this.client.chat.completions.create({
        model: request.modelId, // For direct OpenAI, we use the modelId directly
        messages: [
          {
            role: "user",
            content: request.prompt
          }
        ],
        // Add optional parameters if they exist in request.options
        ...(request.options?.temperature !== undefined && { temperature: request.options.temperature }),
        ...(request.options?.topP !== undefined && { top_p: request.options.topP }),
        ...(request.options?.maxTokens !== undefined && { max_tokens: request.options.maxTokens }),
        // Note: stop parameter is not implemented in this MVP as it's not in the GenerateRequest interface
        // but we could add it if needed in the future
      });

      // Extract data from OpenAI response
      const choice = completion.choices[0];
      const content = choice ? choice.message.content ?? undefined : undefined;
      const finishReason = choice ? choice.finish_reason : undefined;

      // Map OpenAI finish reason to our enum
      let mappedFinishReason: FinishReason.Stop | FinishReason.Length | FinishReason.ToolCalls | FinishReason.ContentFilter | FinishReason.Fault | null | undefined;
      if (finishReason) {
        switch (finishReason) {
          case "stop":
            mappedFinishReason = FinishReason.Stop;
            break;
          case "length":
            mappedFinishReason = FinishReason.Length;
            break;
          case "tool_calls":
            mappedFinishReason = FinishReason.ToolCalls;
            break;
          case "content_filter":
            mappedFinishReason = FinishReason.ContentFilter;
            break;
          default:
            // For any other reason, we map to Fault
            mappedFinishReason = FinishReason.Fault;
            break;
        }
      }

      // Extract usage data
      const usage: TokenUsage | undefined = completion.usage ? {
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens
      } : undefined;

      // Map the response to our AIResponse format
      const aiResponse: AIResponse = {
        providerId: this.id,
        modelId: request.modelId as ModelId,
        content: content,
        usage: usage,
        // Note: We're not calculating latency or cost as per instructions
        // Latency is handled by the orchestrator
        // Cost calculation is handled by the orchestrator if pricing data is available
        finishReason: mappedFinishReason,
      };

      return aiResponse;
    } catch (error) {
      // Handle OpenAI SDK errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      let errorCode = "UNKNOWN_ERROR";

      // Try to extract more specific error information from OpenAI error
      if (error && typeof error === 'object' && 'code' in error) {
        errorCode = String((error as { code: unknown }).code);
      } else if (error && typeof error === 'object' && 'type' in error) {
        errorCode = String((error as { type: unknown }).type);
      }

      throw this.createAIError(`OpenAI API error: ${errorMessage}`, errorCode);
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
export const openAIProvider = new OpenAIProvider();