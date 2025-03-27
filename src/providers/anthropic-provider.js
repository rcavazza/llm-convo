const axios = require('axios');
const LLMProviderInterface = require('./provider-interface');

/**
 * Anthropic API provider implementation
 */
class AnthropicProvider extends LLMProviderInterface {
  /**
   * Create a new Anthropic provider
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super(config);
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    this.apiUrl = 'https://api.anthropic.com/v1/messages';
    this.client = axios.create({
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate a response from the Anthropic API
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} parameters - Additional parameters for the LLM
   * @param {string} systemPrompt - The system prompt defining the character
   * @returns {Promise<string>} The generated response
   * @throws {Error} If the response generation fails
   */
  async generateResponse(prompt, parameters = {}, systemPrompt = '') {
    try {
      const requestData = {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: parameters.maxTokens || 500,
        temperature: parameters.temperature || 0.7,
        top_p: parameters.topP || 1
      };

      // Add system prompt if provided
      if (systemPrompt) {
        requestData.system = systemPrompt;
      }

      const response = await this.client.post(this.apiUrl, requestData);
      
      if (response.status !== 200) {
        throw new Error(`Anthropic API returned status code ${response.status}`);
      }

      const responseData = response.data;
      
      if (!responseData.content || responseData.content.length === 0) {
        throw new Error('Anthropic API returned no content');
      }

      // Extract the text content from the response
      return responseData.content[0].text;
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(`Anthropic API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error(`Anthropic API request error: ${error.message}`);
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(`Anthropic API error: ${error.message}`);
      }
    }
  }

  /**
   * Get provider-specific parameters from character definition
   * @param {Object} characterDefinition - The character definition
   * @returns {Object} Provider-specific parameters
   */
  getProviderParameters(characterDefinition) {
    return {
      temperature: characterDefinition.parameters?.temperature || 0.7,
      maxTokens: characterDefinition.parameters?.maxTokens || 500,
      topP: characterDefinition.parameters?.topP || 1
      // Anthropic doesn't use frequency_penalty or presence_penalty
    };
  }
}

module.exports = AnthropicProvider;