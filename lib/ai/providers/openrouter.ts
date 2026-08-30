// lib/ai/providers/openrouter.ts
// OpenRouter adapter - implements AIProvider interface
import { AIProvider, GenerateRequest, AIResponse, ProviderId, ModelId, FinishReason, AIError, TokenUsage } from "../types";
import { getOpenRouterModelName } from "../catalog";

export class OpenRouterProvider implements AIProvider {
  public readonly id: ProviderId = "openrouter" as ProviderId;
  public readonly name: string = "OpenRouter";

  async generateResponse(request: GenerateRequest): Promise<AIResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw this.createAIError("OPENROUTER_API_KEY environment variable is not set", "MISSING_API_KEY");
    }

    // Get the model name for OpenRouter API from catalog
    const modelName = getOpenRouterModelName(request.modelId);
    // For debugging: log the modelName (remove in production)
    console.log(`OpenRouter modelName: ${modelName}`);

    // Prepare the request body
    const requestBody: Record<string, unknown> = {
      model: modelName,
      messages: [
        {
          role: "user",
          content: request.prompt
        }
      ]
    };

    // Add optional parameters if they exist in request.options
    if (request.options) {
      if (request.options.temperature !== undefined) {
        requestBody.temperature = request.options.temperature;
      }
      if (request.options.topP !== undefined) {
        requestBody.top_p = request.options.topP;
      }
      if (request.options.maxTokens !== undefined) {
        requestBody.max_tokens = request.options.maxTokens;
      }
      // Note: stop parameter is not implemented in this MVP as it's not in the GenerateRequest interface
      // but we could add it if needed in the future
    }

    // Make the API call
    let response: Response;
    try {
      response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      // Handle network errors, timeouts, etc.
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw this.createAIError(`Failed to connect to OpenRouter API: ${errorMessage}`, "NETWORK_ERROR");
    }

    // Handle HTTP error responses
    if (!response.ok) {
      let errorMessage = `OpenRouter API returned ${response.status}`;
      let errorCode = `HTTP_${response.status}`;

      try {
        const errorData = await response.json();
        if (errorData.error?.message) {
          errorMessage = errorData.error.message;
        }
        if (errorData.error?.code) {
          errorCode = String(errorData.error.code);
        }
        // If we have error data but no message, use status text
        if (!errorData.error?.message) {
          errorMessage = response.statusText || errorMessage;
        }
      } catch {
        // If we can't parse the error response, use the status text
        errorMessage = response.statusText || errorMessage;
      }

      throw this.createAIError(errorMessage, errorCode);
    }

    // Parse the successful response
    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw this.createAIError(`Invalid JSON response from OpenRouter API: ${errorMessage}`, "INVALID_RESPONSE");
    }

    // Safely extract data from response with proper typing
    const content = this.getStringProperty(responseData, ['choices', 0, 'message', 'content']);
    const finishReason = this.getStringProperty(responseData, ['choices', 0, 'finish_reason']);
    const usage = this.getUsage(responseData);

    // Map the response to our AIResponse format
    const aiResponse: AIResponse = {
      providerId: this.id,
      modelId: request.modelId as ModelId,
      content: content,
      usage: usage,
      finishReason: finishReason ? this.mapFinishReason(finishReason) : undefined,
      // Note: We're not calculating latency or cost as per instructions
    };

    return aiResponse;
  }

  /**
   * Safely get a string property from a nested object using a path array
   */
  private getStringProperty(obj: unknown, path: Array<string | number>): string | undefined {
    let current: unknown = obj;
    for (const key of path) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[key];
    }
    return typeof current === 'string' ? current : undefined;
  }

  /**
   * Safely get usage object from response
   */
  private getUsage(obj: unknown): TokenUsage | undefined {
    if (!obj || typeof obj !== 'object') return undefined;

    const usageObj = (obj as Record<string, unknown>).usage;
    if (!usageObj || typeof usageObj !== 'object') return undefined;

    const usageRecord = usageObj as Record<string, unknown>;
    return {
      inputTokens: typeof usageRecord.prompt_tokens === 'number' ? usageRecord.prompt_tokens : undefined,
      outputTokens: typeof usageRecord.completion_tokens === 'number' ? usageRecord.completion_tokens : undefined,
      totalTokens: typeof usageRecord.total_tokens === 'number' ? usageRecord.total_tokens : undefined,
    };
  }

  private mapFinishReason(finishReason: string | undefined):
    | FinishReason.Stop
    | FinishReason.Length
    | FinishReason.ToolCalls
    | FinishReason.ContentFilter
    | FinishReason.Fault
    | null
    | undefined {
    if (!finishReason) return undefined;

    switch (finishReason) {
      case "stop":
        return FinishReason.Stop;
      case "length":
        return FinishReason.Length;
      case "tool_calls":
        return FinishReason.ToolCalls;
      case "content_filter":
        return FinishReason.ContentFilter;
      default:
        // For any other reason, we map to Fault or Unknown based on OpenRouter docs
        // OpenRouter may return things like "provider_specific_error" etc.
        return FinishReason.Fault; // Conservative choice for unknown reasons
    }
  }

  private createAIError(message: string, code?: string): AIError {
    return {
      message,
      ...(code && { code })
    };
  }
}

// Export a singleton instance for convenience
export const openRouterProvider = new OpenRouterProvider();