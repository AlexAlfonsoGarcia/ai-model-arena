// lib/ai/providers/openrouter.ts
// OpenRouter adapter - implements AIProvider interface
// For MVP, this is a placeholder; actual HTTP calls will be implemented in later phases.

import { AIProvider, GenerateRequest, AIResponse, ProviderId } from "../types";

export class OpenRouterProvider implements AIProvider {
  public readonly id: ProviderId = "openrouter" as ProviderId;
  public readonly name: string = "OpenRouter";

  /**
   * Generate a response from a model via OpenRouter.
   *
   * In Phase 2 we only define the interface; actual implementation
   * will be added in Phase 3 or 4 when we integrate the API.
   */
  async generateResponse(_: GenerateRequest): Promise<AIResponse> {
    // Use the parameter to avoid unused variable warning
    if (false) {
      console.log(_);
    }
    // Placeholder implementation - throws to indicate not yet implemented
    throw new Error("OpenRouterProvider.generateResponse not yet implemented");
  }
}

// Export a singleton instance for convenience
export const openRouterProvider = new OpenRouterProvider();