// lib/ai/providers/anthropic.ts
// Anthropic provider - implements AIProvider interface using official Anthropic SDK
import { Anthropic } from '@anthropic-ai/sdk';
import { AIProvider, GenerateRequest, AIResponse, ProviderId, ModelId, FinishReason, AIError, TokenUsage } from "../types";

export class AnthropicProvider implements AIProvider {
  public readonly id: ProviderId = "anthropic" as ProviderId;
  public readonly name: string = "Anthropic";

  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Don't throw here - let the generateResponse method handle missing API key
      // This allows the provider to be instantiated even if the key is missing
      // (useful for testing)
      this.client = null as unknown as Anthropic;
    } else {
      this.client = new Anthropic({ apiKey });
    }
  }

  async generateResponse(request: GenerateRequest): Promise<AIResponse> {
    // Check if client is initialized
    if (!this.client) {
      throw this.createAIError("ANTHROPIC_API_KEY environment variable is not set", "MISSING_API_KEY");
    }

    try {
      // Make the API call to Anthropic
      const message = await this.client.messages.create({
        model: request.modelId,
        max_tokens: request.options?.maxTokens ?? 1024, // Anthropic requires max_tokens
        messages: [
          {
            role: "user",
            content: request.prompt
          }
        ],
        // Add optional parameters if they exist in request.options
        ...(request.options?.temperature !== undefined && { temperature: request.options.temperature }),
        ...(request.options?.topP !== undefined && { top_p: request.options.topP }),
        // Note: stop parameter handling would go here if needed
      });

      // Extract data from Anthropic response
      // message.content is Array<ContentBlock> where ContentBlock includes TextBlock (has text) and ThinkingBlock (no text)
      let content: string | undefined = undefined;
      if (Array.isArray(message.content) && message.content.length > 0) {
        const firstBlock = message.content[0];
        // Extract text if it's a TextBlock (has type: 'text' and text property)
        // or if it's a plain object with text property (for test mocks)
        if (firstBlock && typeof firstBlock === 'object') {
          if ('type' in firstBlock && firstBlock.type === 'text' && 'text' in firstBlock) {
            // Real Anthropic SDK TextBlock
            content = (firstBlock as { text: string }).text;
          } else if ('text' in firstBlock && typeof (firstBlock as { text?: string }).text === 'string') {
            // Test mock or plain object with text property
            content = (firstBlock as { text: string }).text;
          }
        }
      }
      const usage = message.usage;
      const stopReason = message.stop_reason;

      // Map Anthropic stop reason to our enum
      let mappedFinishReason: FinishReason.Stop | FinishReason.Length | FinishReason.ToolCalls | FinishReason.ContentFilter | FinishReason.Fault | null | undefined;
      if (stopReason) {
        switch (stopReason) {
          case "end_turn":
            mappedFinishReason = FinishReason.Stop;
            break;
          case "max_tokens":
            mappedFinishReason = FinishReason.Length;
            break;
          case "stop_sequence":
            // This could be considered a stop reason
            mappedFinishReason = FinishReason.Stop;
            break;
          case "tool_use":
            mappedFinishReason = FinishReason.ToolCalls;
            break;
          case "refusal":
            // Treat refusal as a content filter or fault
            mappedFinishReason = FinishReason.ContentFilter;
            break;
          default:
            // For any other reason, we map to Fault
            mappedFinishReason = FinishReason.Fault;
            break;
        }
      }

      // Extract usage data
      const tokenUsage: TokenUsage | undefined = usage ? {
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens
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
      // Handle Anthropic SDK errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      let errorCode = "UNKNOWN_ERROR";

      // Try to extract more specific error information from Anthropic error
      if (error && typeof error === 'object' && 'type' in error) {
        const errorType = String((error as { type: unknown }).type);
        // Map Anthropic error types to our error codes
        if (errorType.includes('invalid_api_key') || errorType.includes('authentication')) {
          errorCode = "invalid_api_key";
        } else if (errorType.includes('rate_limit')) {
          errorCode = "rate_limit_exceeded";
        } else if (errorType.includes('not_found') || errorType.includes('invalid_request')) {
          errorCode = "invalid_request";
        } else {
          errorCode = errorType;
        }
      } else if (error && typeof error === 'object' && 'message' in error) {
        // Some errors might have a message we can use for categorization
        const errorMsg = String((error as { message: unknown }).message).toLowerCase();
        if (errorMsg.includes('invalid api key') || errorMsg.includes('invalid_api_key') || errorMsg.includes('authentication')) {
          errorCode = "invalid_api_key";
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('rate_limit')) {
          errorCode = "rate_limit_exceeded";
        } else if (errorMsg.includes('not found') || errorMsg.includes('not_found') || errorMsg.includes('invalid request') || errorMsg.includes('invalid_request')) {
          errorCode = "invalid_request";
        }
      }

      throw this.createAIError(`Anthropic API error: ${errorMessage}`, errorCode);
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
export const anthropicProvider = new AnthropicProvider();