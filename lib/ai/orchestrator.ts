// lib/ai/orchestrator.ts
// Comparison Orchestrator - executes AI requests against multiple providers and normalizes results
import { AIProvider, GenerateRequest, AIResponse, ModelId, Model, ProviderId } from "./types";
import { ProviderRegistry, providerRegistry } from "./registry";
import { getModelById, modelCatalog } from "./catalog";
// Import provider instances to register them with the registry
import { openRouterProvider } from "./providers/openrouter";
import { openAIProvider } from "./providers/openai";
import { anthropicProvider } from "./providers/anthropic";
import { googleProvider } from "./providers/google";

/**
 * Register providers with the registry if not already registered.
 * This ensures providers are available when the orchestrator resolves them.
 */
if (!providerRegistry.has(openRouterProvider.id)) {
  providerRegistry.register(openRouterProvider);
}
if (!providerRegistry.has(openAIProvider.id)) {
  providerRegistry.register(openAIProvider);
}
if (!providerRegistry.has(anthropicProvider.id)) {
  providerRegistry.register(anthropicProvider);
}
if (!providerRegistry.has(googleProvider.id)) {
  providerRegistry.register(googleProvider);
}

/**
 * Orchestrates comparisons across multiple AI providers.
 * Uses the provider registry to resolve providers and executes requests in parallel.
 */
export class ComparisonOrchestrator {
  constructor(
    private readonly registry: ProviderRegistry = providerRegistry,
    private readonly getModelFn: (id: ModelId) => Model | undefined = getModelById,
    private readonly catalog: readonly Model[] = modelCatalog
  ) {}

  /**
   * Compares the given requests across their respective providers.
   * Each request is executed in parallel, and individual failures are isolated.
   *
   * @param requests - Array of generation requests to execute
   * @returns Promise resolving to array of AIResponses (one per request)
   */
  async compare(requests: GenerateRequest[]): Promise<AIResponse[]> {
    // Map each request to a promise that handles provider resolution, execution, and enrichment
    const promises = requests.map(async (request) => {
      // Step 1: Resolve the model from the catalog
      const model = this.getModelFn(request.modelId);
      if (!model) {
        // Model not found in catalog
        return this.createErrorResponse(
          "unknown",
          request.modelId,
          `Model not found: ${request.modelId}`
        );
      }

      // Step 2: Find a route for the model (we use the first available route)
      const route = model.routes.find((r) => r.providerId);
      if (!route) {
        // No route defined for the model
        return this.createErrorResponse(
          "unknown",
          request.modelId,
          `No route found for model: ${request.modelId}`
        );
      }

      // Step 3: Get the provider from the registry
      let provider: AIProvider;
      try {
        provider = this.registry.get(route.providerId);
      } catch {
        // Provider not registered
        return this.createErrorResponse(
          route.providerId,
          request.modelId,
          `Provider not found: ${route.providerId}`
        );
      }

      // Step 4: Execute the request with latency measurement
      const startTime = Date.now();
      let providerResponse: AIResponse;
      try {
        providerResponse = await provider.generateResponse(request);
      } catch (err) {
        // Provider execution failed (network error, API error, etc.)
        const latencyMs = Date.now() - startTime;
        const errorMessage = err instanceof Error ? err.message : String(err);
        return {
          ...this.createErrorResponse(
            provider.id,
            request.modelId,
            errorMessage
          ),
          latencyMs,
        };
      }
      const latencyMs = Date.now() - startTime;

      // Step 5: Enrich the successful response with latency and cost
      const enriched: AIResponse = {
        ...providerResponse,
        latencyMs,
      };

      // Calculate estimated cost if pricing data is available
      if (
        providerResponse.usage &&
        model.pricing &&
        typeof model.pricing.inputPerMillionTokens === "number" &&
        typeof model.pricing.outputPerMillionTokens === "number"
      ) {
        const inputCost =
          (providerResponse.usage.inputTokens ?? 0) *
          (model.pricing.inputPerMillionTokens ?? 0) /
          1_000_000;
        const outputCost =
          (providerResponse.usage.outputTokens ?? 0) *
          (model.pricing.outputPerMillionTokens ?? 0) /
          1_000_000;
        enriched.estimatedCost = inputCost + outputCost;
      }

      return enriched;
    });

    // Execute all requests in parallel and wait for all to complete
    return Promise.all(promises);
  }

  /**
   * Creates a standardized error response for failed requests.
   *
   * @param providerId - ID of the provider (or "unknown" if not available)
   * @param modelId - ID of the model being requested
   * @param message - Error message to convey
   * @returns An AIResponse representing the error
   */
  private createErrorResponse(
    providerId: string,
    modelId: ModelId,
    message: string
  ): AIResponse {
    return {
      providerId: providerId as ProviderId, // Type assertion: we know it's a string
      modelId,
      content: undefined,
      usage: undefined,
      latencyMs: 0,
      estimatedCost: undefined,
      finishReason: undefined,
      error: message,
    };
  }
}

// Export a singleton instance for convenience
export const comparisonOrchestrator = new ComparisonOrchestrator();