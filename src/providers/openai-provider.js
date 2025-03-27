const axios = require('axios');
const LLMProviderInterface = require('./provider-interface');

/**
 * OpenAI API provider implementation
 */
class OpenAIProvider extends LLMProviderInterface {
  /**
   * Create a new OpenAI provider
   * @param {Object} config - Provider configuration
   */
  constructor(config) {
    super(config);
    this.apiKey = process.env.OPENAI_API_KEY;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.client = axios.create({
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Generate a response from the OpenAI API
   * @param {string} prompt - The prompt to send to the LLM
   * @param {Object} parameters - Additional parameters for the LLM
   * @param {Object} systemPrompt - The system prompt defining the character
   * @returns {Promise<string>} The generated response
   * @throws {Error} If the response generation fails
   */
  async generateResponse(prompt, parameters = {}, systemPrompt = '') {
    try {
      const messages = [];
      
      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      // Add user prompt
      messages.push({
        role: 'user',
        content: prompt
      });

      const requestData = {
        model: this.model,
        messages: messages,
        temperature: parameters.temperature || 0.7,
        max_tokens: parameters.maxTokens || 500,
        top_p: parameters.topP || 1,
        frequency_penalty: parameters.frequencyPenalty || 0,
        presence_penalty: parameters.presencePenalty || 0
      };

      const response = await this.client.post(this.apiUrl, requestData);
      
      if (response.status !== 200) {
        throw new Error(`OpenAI API returned status code ${response.status}`);
      }

      const responseData = response.data;
      
      if (!responseData.choices || responseData.choices.length === 0) {
        throw new Error('OpenAI API returned no choices');
      }

      return responseData.choices[0].message.content.trim();
    } catch (error) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(`OpenAI API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error(`OpenAI API request error: ${error.message}`);
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(`OpenAI API error: ${error.message}`);
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
      topP: characterDefinition.parameters?.topP || 1,
      frequencyPenalty: characterDefinition.parameters?.frequencyPenalty || 0,
      presencePenalty: characterDefinition.parameters?.presencePenalty || 0
    };
  }
}

module.exports = OpenAIProvider;