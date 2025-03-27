const OpenAIProvider = require('./openai-provider');
const AnthropicProvider = require('./anthropic-provider');

/**
 * Factory for creating LLM providers
 */
class ProviderFactory {
  /**
   * Create a new provider factory
   */
  constructor() {
    this.providerClasses = {
      'openai': OpenAIProvider,
      'anthropic': AnthropicProvider
    };
  }

  /**
   * Register a new provider class
   * @param {string} providerName - The name of the provider
   * @param {class} providerClass - The provider class
   */
  registerProvider(providerName, providerClass) {
    this.providerClasses[providerName] = providerClass;
  }

  /**
   * Create a provider instance
   * @param {Object} config - The provider configuration
   * @returns {Object} The provider instance
   * @throws {Error} If the provider is not supported
   */
  createProvider(config) {
    const providerName = config.provider.toLowerCase();
    const ProviderClass = this.providerClasses[providerName];
    
    if (!ProviderClass) {
      throw new Error(`Provider ${providerName} is not supported`);
    }
    
    return new ProviderClass(config);
  }

  /**
   * Get a list of supported providers
   * @returns {Array<string>} The list of supported providers
   */
  getSupportedProviders() {
    return Object.keys(this.providerClasses);
  }

  /**
   * Check if a provider is supported
   * @param {string} providerName - The name of the provider
   * @returns {boolean} True if the provider is supported
   */
  isProviderSupported(providerName) {
    return Boolean(this.providerClasses[providerName.toLowerCase()]);
  }
}

module.exports = new ProviderFactory();