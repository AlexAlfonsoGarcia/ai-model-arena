// Domain model for AI Provider abstraction - Provider agnostic

// Branded types for better type safety
export type ProviderId = string & { readonly __brand: unique symbol };
export type ModelId = string & { readonly __brand: unique symbol };
export type OrganizationId = string & { readonly __brand: unique symbol };
export type ModelName = string & { readonly __brand: unique symbol }; // provider-specific model identifier

export enum ModelCapability {
  Text = "text",
  Vision = "vision",
  Audio = "audio",
  Video = "video",
  Code = "code",
  Embedding = "embedding",
}

export enum ModelModality {
  Text = "text",
  Image = "image",
  Audio = "audio",
  Video = "video",
  Embedding = "embedding",
}

export enum ModelAvailability {
  Stable = "stable",
  Preview = "preview",
  Deprecated = "deprecated",
}

export enum FinishReason {
  Stop = "stop",
  Length = "length",
  ToolCalls = "tool_calls",
  ContentFilter = "content_filter",
  Fault = "fault",
  Unknown = "unknown",
}

export interface Pricing {
  inputPerMillionTokens: number; // USD
  outputPerMillionTokens: number; // USD
}

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AIProvider {
  id: ProviderId;
  name: string;
  // Configuration would be injected via environment, not stored here

  generateResponse(request: GenerateRequest): Promise<AIResponse>;
}

export interface ModelRoute {
  providerId: ProviderId;
  // Optional: model name as expected by the provider (may differ from user-facing ModelId)
  modelName?: ModelName;
}

export interface Model {
  id: ModelId; // User-facing model ID (e.g., "deepseek-ai/deepseek-v4-pro")
  displayName: string;
  organization: OrganizationId;
  modelName?: ModelName; // Optional: the exact identifier expected by provider
  routes: ModelRoute[]; // One or more ways to access this model
  capabilities?: ModelCapability[];
  modalities?: ModelModality[];
  contextWindow?: number; // in tokens
  pricing?: Pricing;
  availability?: ModelAvailability;
}

export interface GenerateOptions {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stop?: string | string[];
  // Additional provider-agnostic options can be added here
}

export interface GenerateRequest {
  prompt: string;
  modelId: ModelId;
  options?: GenerateOptions;
}

export interface AIResponse {
  providerId: ProviderId;
  modelId: ModelId;
  // For text models:
  content?: string;
  // Token usage (if available)
  usage?: TokenUsage;
  // Latency in milliseconds
  latencyMs?: number;
  // Estimated cost in USD (if pricing available)
  estimatedCost?: number;
  // Reason generation stopped
  finishReason?:
    | FinishReason.Stop
    | FinishReason.Length
    | FinishReason.ToolCalls
    | FinishReason.ContentFilter
    | FinishReason.Fault
    | null;
  // Error if the provider failed (partial results still possible)
  error?: string;
}

export interface AIError {
  message: string;
  type?: string;
  // Optional provider-specific code
  code?: string;
}