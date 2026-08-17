import { ComparisonOrchestrator } from "../orchestrator";
import { ProviderRegistry } from "../registry";
import { ModelId, Model } from "../catalog";
import { AIProvider, ProviderId } from "../types";
import { vi } from "vitest";

describe("ComparisonOrchestrator", () => {
  const mockGetModelById = vi.fn<(modelId: ModelId) => Model | undefined>();
  const mockCatalog: Model[] = [];

  beforeEach(() => {
    mockGetModelById.mockReset();
  });

  /** Helper to create a mock registry with a mocked get method */
  function createMockRegistry(getMock: ReturnType<typeof vi.fn>): ProviderRegistry {
    class MockProviderRegistry extends ProviderRegistry {
      get = getMock;
      constructor() {
        super();
      }
    }
    return new MockProviderRegistry();
  }

  describe("single provider", () => {
    test("executes successful request and returns normalized response", async () => {
      const modelId = "test-model" as ModelId;
      const providerId = "test-provider";
      const prompt = "Hello";

      // Mock the model lookup
      const mockModel: Model = {
        id: modelId,
        displayName: "Test Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      mockGetModelById.mockReturnValue(mockModel);

      // Mock the provider
      const mockProvider: AIProvider = {
        id: providerId as ProviderId,
        name: "Test Provider",
        generateResponse: vi.fn().mockResolvedValue({
          providerId: providerId as ProviderId,
          modelId,
          content: "Hello back!",
          usage: {
            inputTokens: 5,
            outputTokens: 3,
            totalTokens: 8,
          },
          latencyMs: undefined,
          estimatedCost: undefined,
          finishReason: "stop",
          error: undefined,
        }),
      };
      const mockRegistry = createMockRegistry(vi.fn().mockReturnValue(mockProvider));

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [
        {
          prompt,
          modelId,
        },
      ];

      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(1);
      const response = responses[0];
      expect(response.providerId).toBe(providerId);
      expect(response.modelId).toBe(modelId);
      expect(response.content).toBe("Hello back!");
      expect(response.usage).toEqual({
        inputTokens: 5,
        outputTokens: 3,
        totalTokens: 8,
      });
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
      expect(response.error).toBeUndefined();
      expect(mockProvider.generateResponse).toHaveBeenCalledWith({
        prompt,
        modelId,
      });
      expect(mockRegistry.get).toHaveBeenCalledWith(providerId);
    });
  });

  describe("multiple providers", () => {
    test("executes requests against multiple providers in parallel", async () => {
      const modelId1 = "model-1" as ModelId;
      const modelId2 = "model-2" as ModelId;
      const providerId1 = "provider-1";
      const providerId2 = "provider-2";
      const prompt = "Hello";

      // Mock the model lookups
      const mockModel1: Model = {
        id: modelId1,
        displayName: "Test Model 1",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId1 } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      const mockModel2: Model = {
        id: modelId2,
        displayName: "Test Model 2",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId2 } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      mockGetModelById
        .mockReturnValueOnce(mockModel1)
        .mockReturnValueOnce(mockModel2);

      // Mock the providers
      const mockProvider1: AIProvider = {
        id: providerId1 as ProviderId,
        name: "Test Provider 1",
        generateResponse: vi.fn()
          .mockResolvedValueOnce({
            providerId: providerId1 as ProviderId,
            modelId: modelId1,
            content: "Response 1",
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
            latencyMs: undefined,
            estimatedCost: undefined,
            finishReason: "stop",
            error: undefined,
          }),
      };
      const mockProvider2: AIProvider = {
        id: providerId2 as ProviderId,
        name: "Test Provider 2",
        generateResponse: vi.fn()
          .mockResolvedValueOnce({
            providerId: providerId2 as ProviderId,
            modelId: modelId2,
            content: "Response 2",
            usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 },
            latencyMs: undefined,
            estimatedCost: undefined,
            finishReason: "stop",
            error: undefined,
          }),
      };
      const getMock = vi.fn().mockImplementation((id: string) => {
        if (id === providerId1) return mockProvider1;
        if (id === providerId2) return mockProvider2;
        throw new Error(`Provider not found: ${id}`);
      });
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [
        { prompt, modelId: modelId1 },
        { prompt, modelId: modelId2 },
      ];

      const responses = await orchestrator.compare(requests);

      // Because we mocked the providers to resolve immediately, the total time should be small
      // but we can at least assert that both providers were called
      expect(responses).toHaveLength(2);
      expect(responses[0].content).toBe("Response 1");
      expect(responses[1].content).toBe("Response 2");
      expect(mockProvider1.generateResponse).toHaveBeenCalledTimes(1);
      expect(mockProvider2.generateResponse).toHaveBeenCalledTimes(1);

      // Check that the calls were made with the correct arguments
      expect(mockProvider1.generateResponse).toHaveBeenCalledWith({
        prompt,
        modelId: modelId1,
      });
      expect(mockProvider2.generateResponse).toHaveBeenCalledWith({
        prompt,
        modelId: modelId2,
      });
      expect(getMock).toHaveBeenCalledWith(providerId1);
      expect(getMock).toHaveBeenCalledWith(providerId2);
    });
  });

  describe("parallel execution", () => {
    test("executes requests in parallel (not sequentially)", async () => {
      // We'll use vi.fn with mock implementation that delays to simulate async work
      const modelId = "test-model" as ModelId;
      const providerId = "test-provider";
      const prompt = "Hello";

      const mockModel: Model = {
        id: modelId,
        displayName: "Test Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      mockGetModelById.mockReturnValue(mockModel);

      // Create a mock provider that delays its response
      const mockProvider: AIProvider = {
        id: providerId as ProviderId,
        name: "Test Provider",
        generateResponse: vi.fn().mockImplementation((request) => {
          return new Promise<AIResponse>((resolve) => {
            setTimeout(() => {
              resolve({
                providerId: providerId as ProviderId,
                modelId: request.modelId,
                content: "Delayed response",
                usage: undefined,
                latencyMs: undefined,
                estimatedCost: undefined,
                finishReason: undefined,
                error: undefined,
              } as AIResponse);
            }, 10); // 10ms delay
          }) as Promise<AIResponse>;
        }),
      };
      const getMock = vi.fn().mockReturnValue(mockProvider);
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      // Fire off three requests
      const requests: GenerateRequest[] = [
        { prompt, modelId },
        { prompt, modelId },
        { prompt, modelId },
      ];

      const start = Date.now();
      const responses = await orchestrator.compare(requests);
      const end = Date.now();

      // If executed sequentially, we'd expect ~30ms (3 * 10ms)
      // If executed in parallel, we'd expect ~10ms (the longest delay)
      // We'll allow a bit of overhead
      const totalTime = end - start;
      expect(totalTime).toBeLessThan(30); // Should be much less than 30ms if parallel
      expect(responses).toHaveLength(3);
      expect(mockProvider.generateResponse).toHaveBeenCalledTimes(3);
      expect(getMock).toHaveBeenCalledTimes(3);
    });
  });

  describe("error isolation", () => {
    test("one provider failure does not prevent other providers from succeeding", async () => {
      const modelId1 = "good-model" as ModelId;
      const modelId2 = "bad-model" as ModelId;
      const providerId1 = "good-provider";
      const providerId2 = "bad-provider";
      const prompt = "Hello";

      // Mock the models
      const mockModelGood: Model = {
        id: modelId1,
        displayName: "Good Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId1 } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      const mockModelBad: Model = {
        id: modelId2,
        displayName: "Bad Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId2 } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      mockGetModelById
        .mockReturnValueOnce(mockModelGood)
        .mockReturnValueOnce(mockModelBad);

      // Mock the good provider
      const mockProviderGood: AIProvider = {
        id: providerId1 as ProviderId,
        name: "Good Provider",
        generateResponse: vi.fn().mockResolvedValue({
          providerId: providerId1 as ProviderId,
          modelId: modelId1,
          content: "Success",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          latencyMs: undefined,
          estimatedCost: undefined,
          finishReason: "stop",
          error: undefined,
        }),
      };
      // Mock the bad provider to throw an error
      const mockProviderBad: AIProvider = {
        id: providerId2 as ProviderId,
        name: "Bad Provider",
        generateResponse: vi.fn().mockRejectedValue(
          new Error("Provider failure")
        ),
      };
      // Mock registry: get returns appropriate provider or throws
      const getMock = vi.fn().mockImplementation((id: string) => {
        if (id === providerId1) return mockProviderGood;
        if (id === providerId2) return mockProviderBad;
        throw new Error(`Provider not found: ${id}`);
      });
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [
        { prompt, modelId: modelId1 },
        { prompt, modelId: modelId2 },
      ];

      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(2);
      // First response should be successful
      expect(responses[0].providerId).toBe(providerId1);
      expect(responses[0].content).toBe("Success");
      expect(responses[0].error).toBeUndefined();
      // Second response should be an error
      expect(responses[1].providerId).toBe(providerId2);
      expect(responses[1].content).toBeUndefined();
      expect(responses[1].error).toBe("Provider failure");
      // Ensure both providers were attempted
      expect(mockProviderGood.generateResponse).toHaveBeenCalledTimes(1);
      expect(mockProviderBad.generateResponse).toHaveBeenCalledTimes(1);
      expect(getMock).toHaveBeenCalledWith(providerId1);
      expect(getMock).toHaveBeenCalledWith(providerId2);
    });
  });

  describe("latency measurement", () => {
    test("measures latency for each provider request", async () => {
      const modelId = "test-model" as ModelId;
      const providerId = "test-provider";
      const prompt = "Hello";

      const mockModel: Model = {
        id: modelId,
        displayName: "Test Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      mockGetModelById.mockReturnValue(mockModel);

      // Mock a provider that takes a fixed amount of time
      const mockProvider: AIProvider = {
        id: providerId as ProviderId,
        name: "Test Provider",
        generateResponse: vi.fn().mockImplementation((request) => {
          return new Promise<AIResponse>((resolve) => {
            setTimeout(() => {
              resolve({
                providerId: providerId as ProviderId,
                modelId: request.modelId,
                content: "Response",
                usage: undefined,
                latencyMs: undefined,
                estimatedCost: undefined,
                finishReason: undefined,
                error: undefined,
              });
            }, 15); // 15ms delay
          });
        }),
      };
      const getMock = vi.fn().mockReturnValue(mockProvider);
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [{ prompt, modelId }];
      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(1);
      const latency = responses[0].latencyMs;
      // Latency should be at least the delay we set (15ms) but may be more due to overhead
      expect(latency).toBeGreaterThanOrEqual(15);
      // We don't assert an exact value because of environmental variance
      expect(getMock).toHaveBeenCalledWith(providerId);
    });
  });

  describe("cost calculation", () => {
    test("calculates estimated cost when pricing and usage are available", async () => {
      const modelId = "priced-model" as ModelId;
      const providerId = "test-provider";
      const prompt = "Hello";

      const mockModel: Model = {
        id: modelId,
        displayName: "Priced Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId } as ModelRoute],
        capabilities: [],
        modalities: [],
        // Pricing: $0.01 per 1M input tokens, $0.02 per 1M output tokens
        pricing: {
          inputPerMillionTokens: 0.01,
          outputPerMillionTokens: 0.02,
        },
      };
      mockGetModelById.mockReturnValue(mockModel);

      const mockProvider: AIProvider = {
        id: providerId as ProviderId,
        name: "Test Provider",
        generateResponse: vi.fn().mockResolvedValue({
          providerId: providerId as ProviderId,
          modelId,
          content: "Response",
          usage: {
            inputTokens: 1000, // 1K tokens
            outputTokens: 2000, // 2K tokens
            totalTokens: 3000,
          },
          latencyMs: undefined,
          estimatedCost: undefined,
          finishReason: "stop",
          error: undefined,
        }),
      };
      const getMock = vi.fn().mockReturnValue(mockProvider);
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [{ prompt, modelId }];
      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(1);
      const response = responses[0];
      // Expected cost:
      // Input: 1000 tokens * ($0.01 / 1_000_000) = 0.00001
      // Output: 2000 tokens * ($0.02 / 1_000_000) = 0.00004
      // Total: 0.00005
      expect(response.estimatedCost).toBeCloseTo(0.00005);
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
      expect(getMock).toHaveBeenCalledWith(providerId);
    });

    test("does not calculate cost when pricing is missing", async () => {
      const modelId = "free-model" as ModelId;
      const providerId = "test-provider";
      const prompt = "Hello";

      const mockModel: Model = {
        id: modelId,
        displayName: "Free Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId } as ModelRoute],
        capabilities: [],
        modalities: [],
        pricing: undefined, // No pricing data
      };
      mockGetModelById.mockReturnValue(mockModel);

      const mockProvider: AIProvider = {
        id: providerId as ProviderId,
        name: "Test Provider",
        generateResponse: vi.fn().mockResolvedValue({
          providerId: providerId as ProviderId,
          modelId,
          content: "Response",
          usage: {
            inputTokens: 100,
            outputTokens: 100,
            totalTokens: 200,
          },
          latencyMs: undefined,
          estimatedCost: undefined,
          finishReason: "stop",
          error: undefined,
        }),
      };
      const getMock = vi.fn().mockReturnValue(mockProvider);
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [{ prompt, modelId }];
      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(1);
      const response = responses[0];
      expect(response.estimatedCost).toBeUndefined();
      expect(response.usage).toEqual({
        inputTokens: 100,
        outputTokens: 100,
        totalTokens: 200,
      });
      expect(getMock).toHaveBeenCalledWith(providerId);
    });

    test("does not calculate cost when usage is missing", async () => {
      const modelId = "no-usage-model" as ModelId;
      const providerId = "test-provider";
      const prompt = "Hello";

      const mockModel: Model = {
        id: modelId,
        displayName: "No Usage Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId } as ModelRoute],
        capabilities: [],
        modalities: [],
        pricing: {
          inputPerMillionTokens: 0.01,
          outputPerMillionTokens: 0.02,
        },
      };
      mockGetModelById.mockReturnValue(mockModel);

      const mockProvider: AIProvider = {
        id: providerId as ProviderId,
        name: "Test Provider",
        generateResponse: vi.fn().mockResolvedValue({
          providerId: providerId as ProviderId,
          modelId,
          content: "Response",
          usage: undefined, // No usage
          latencyMs: undefined,
          estimatedCost: undefined,
          finishReason: "stop",
          error: undefined,
        }),
      };
      const getMock = vi.fn().mockReturnValue(mockProvider);
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [{ prompt, modelId }];
      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(1);
      const response = responses[0];
      expect(response.estimatedCost).toBeUndefined();
      expect(response.usage).toBeUndefined();
      expect(getMock).toHaveBeenCalledWith(providerId);
    });
  });

  describe("missing usage", () => {
    test("handles response with missing usage gracefully", async () => {
      const modelId = "no-usage-model" as ModelId;
      const providerId = "test-provider";
      const prompt = "Hello";

      const mockModel: Model = {
        id: modelId,
        displayName: "No Usage Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      mockGetModelById.mockReturnValue(mockModel);

      const mockProvider: AIProvider = {
        id: providerId as ProviderId,
        name: "Test Provider",
        generateResponse: vi.fn().mockResolvedValue({
          providerId: providerId as ProviderId,
          modelId,
          content: "Response",
          usage: undefined,
          latencyMs: undefined,
          estimatedCost: undefined,
          finishReason: "stop",
          error: undefined,
        }),
      };
      const getMock = vi.fn().mockReturnValue(mockProvider);
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [{ prompt, modelId }];
      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(1);
      const response = responses[0];
      expect(response.content).toBe("Response");
      expect(response.usage).toBeUndefined();
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
      expect(response.error).toBeUndefined();
      expect(getMock).toHaveBeenCalledWith(providerId);
    });
  });

  describe("unknown/unavailable provider", () => {
    test("returns error response when provider cannot be resolved", async () => {
      const modelId = "unknown-model" as ModelId;
      const providerId = "unknown-provider";
      const prompt = "Hello";

      const mockModel: Model = {
        id: modelId,
        displayName: "Unknown Model",
        organization: "test-org" as OrganizationId,
        routes: [{ providerId: providerId } as ModelRoute],
        capabilities: [],
        modalities: [],
      };
      mockGetModelById.mockReturnValue(mockModel);

      // Mock registry: get throws an error
      const getMock = vi.fn().mockImplementation(() => {
        throw new Error(`Provider not found: ${providerId}`);
      });
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [{ prompt, modelId }];
      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(1);
      const response = responses[0];
      expect(response.providerId).toBe("unknown-provider");
      expect(response.modelId).toBe(modelId);
      expect(response.content).toBeUndefined();
      expect(response.usage).toBeUndefined();
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
      expect(response.error).toBe(`Provider not found: ${providerId}`);
      expect(getMock).toHaveBeenCalledWith(providerId);
    });
  });

  describe("unknown model", () => {
    test("returns error response when model is not found in catalog", async () => {
      const modelId = "non-existent-model" as ModelId;
      const prompt = "Hello";

      mockGetModelById.mockReturnValue(undefined);

      const getMock = vi.fn();
      const mockRegistry = createMockRegistry(getMock);

      const orchestrator = new ComparisonOrchestrator(
        mockRegistry,
        mockGetModelById,
        mockCatalog
      );

      const requests: GenerateRequest[] = [{ prompt, modelId }];
      const responses = await orchestrator.compare(requests);

      expect(responses).toHaveLength(1);
      const response = responses[0];
      expect(response.providerId).toBe("unknown");
      expect(response.modelId).toBe(modelId);
      expect(response.content).toBeUndefined();
      expect(response.usage).toBeUndefined();
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
      expect(response.error).toBe(`Model not found: ${modelId}`);
      expect(getMock).not.toHaveBeenCalled();
    });
  });
});