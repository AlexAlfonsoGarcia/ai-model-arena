// Provider Registry - manages available AI providers
import { AIProvider } from "./types";

/**
 * Registry of providers keyed by providerId.
 * Providers are registered at application startup.
 */
export class ProviderRegistry {
  private providers: Map<string, AIProvider> = new Map();

  /**
   * Register a provider instance.
   * @param provider - Provider to register (its id is used as the key)
   */
  register(provider: AIProvider): void {
    if (this.providers.has(provider.id)) {
      console.warn(`Provider ${provider.id} is already registered and will be overwritten.`);
    }
    this.providers.set(provider.id, provider);
  }

  /**
   * Get a provider by its ID.
   * @throws Error if provider not found
   */
  get(providerId: string): AIProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    return provider;
  }

  /**
   * Check if a provider is registered.
   */
  has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get all registered provider IDs.
   */
  getProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Clear the registry (mainly for testing).
   */
  clear(): void {
    this.providers.clear();
  }
}

// Export a singleton instance for use across the application
export const providerRegistry = new ProviderRegistry();