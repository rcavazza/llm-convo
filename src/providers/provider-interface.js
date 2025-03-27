/**
 * Interface for LLM providers
 * All provider implementations must extend this class
 */
class LLMProviderInterface {
  /**
   * Create a new LLM provider
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    if (new.target === LLMProviderInterface) {
      throw new Error('LLMProviderInterface is an abstract class and cannot be instantiated directly');
    }
    
    this.config = config;
    this.name = config.provider;
    this.model = config.model;
  }

  /**
   * Generate a response from the LLM
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} parameters - Additional parameters for the LLM
   * @returns {Promise<string>} The generated response
   * @throws {Error} If the response generation fails
   */
  async generateResponse(prompt, parameters) {
    throw new Error('Method generateResponse() must be implemented by subclasses');
  }

  /**
   * Get the provider name
   * @returns {string} The provider name
   */
  getProviderName() {
    return this.name;
  }

  /**
   * Get the model name
   * @returns {string} The model name
   */
  getModelName() {
    return this.model;
  }

  /**
   * Check if the provider is properly configured
   * @returns {boolean} True if the provider is properly configured
   */
  isConfigured() {
    return Boolean(this.config && this.config.apiKey);
  }

  /**
   * Get provider-specific parameters from character definition
   * @param {Object} characterDefinition - The character definition
   * @returns {Object} Provider-specific parameters
   */
  getProviderParameters(characterDefinition) {
    return {
      ...characterDefinition.parameters,
      // Add any provider-specific defaults here
    };
  }
}

module.exports = LLMProviderInterface;