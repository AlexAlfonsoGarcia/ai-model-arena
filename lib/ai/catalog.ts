// lib/ai/catalog.ts
// Model Catalog - statically typed list of models available via OpenRouter (MVP)
// Only include verified data; leave unknown fields as undefined.

import { Model, ModelId, ProviderId, OrganizationId, ModelCapability, ModelModality } from "./types";

export const modelCatalog: Model[] = [
  {
    id: "01-ai/yi-large" as ModelId,
    displayName: "Yi Large",
    organization: "01-ai" as OrganizationId,
    // modelName: optional if same as id for OpenRouter
    routes: [
      {
        providerId: "openrouter" as ProviderId,
        // providerModelName: optional, defaults to id
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown -> leave undefined
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "deepseek-ai/deepseek-v4-pro" as ModelId,
    displayName: "DeepSeek V4 Pro",
    organization: "deepseek-ai" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "deepseek-ai/deepseek-v4-flash" as ModelId,
    displayName: "DeepSeek V4 Flash",
    organization: "deepseek-ai" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "google/gemma-4-31b-it" as ModelId,
    displayName: "Gemma 4 31B IT",
    organization: "google" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "meta/llama-3.3-70b-instruct" as ModelId,
    displayName: "Llama 3.3 70B Instruct",
    organization: "meta" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "mistralai/mistral-large-2-instruct" as ModelId,
    displayName: "Mistral Large 2 Instruct",
    organization: "mistralai" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "openai/gpt-oss-120b" as ModelId,
    displayName: "GPT OSS 120B",
    organization: "openai" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "openai/gpt-oss-20b" as ModelId,
    displayName: "GPT OSS 20B",
    organization: "openai" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "moonshotai/kimi-k2.6" as ModelId,
    displayName: "Kimi K2.6",
    organization: "moonshotai" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1.5" as ModelId,
    displayName: "Llama 3.3 Nemotron Super 49B V1.5",
    organization: "nvidia" as OrganizationId,
    routes: [
      {
        providerId: "openrouter" as ProviderId,
      },
    ],
    capabilities: ["text"] as ModelCapability[],
    modalities: ["text"] as ModelModality[],
    // contextWindow, pricing, availability: unknown
    contextWindow: undefined,
    pricing: undefined,
    availability: undefined,
  },
];

/**
 * Get a model by its user-facing ID.
 * Returns undefined if not found.
 */
export function getModelById(id: ModelId): Model | undefined {
  return modelCatalog.find(m => m.id === id);
}

/**
 * Get the model name to use when calling the OpenRouter API.
 * If the model has a route with a providerModelName override, use that;
 * otherwise fall back to the model's id.
 */
export function getOpenRouterModelName(modelId: ModelId): string | undefined {
  const model = getModelById(modelId);
  if (!model) return undefined;
  const route = model.routes.find(r => r.providerId === "openrouter");
  if (!route) return undefined;
  // If we had a providerModelName field we'd use it; for MVP we don't store it separately.
  return model.id; // assumes the model ID is the OpenRouter model name
}