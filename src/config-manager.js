const fs = require('fs-extra');
const path = require('path');

/**
 * Manages loading and validating configuration files
 */
class ConfigurationManager {
  /**
   * Create a new ConfigurationManager
   * @param {string} configPath - Path to the main configuration file
   */
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
    this.characterDefinitions = {};
  }

  /**
   * Load the main configuration file
   * @returns {Object} The loaded configuration
   * @throws {Error} If the configuration file cannot be loaded or is invalid
   */
  async loadConfig() {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      await this.validateConfig();
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Load a character definition file
   * @param {string} llmId - The ID of the LLM
   * @returns {Object} The character definition
   * @throws {Error} If the character definition file cannot be loaded or is invalid
   */
  async loadCharacterDefinition(llmId) {
    if (!this.config) {
      throw new Error('Configuration must be loaded before loading character definitions');
    }

    const llmConfig = this.config.llmProviders.find(provider => provider.id === llmId);
    if (!llmConfig) {
      throw new Error(`LLM with ID ${llmId} not found in configuration`);
    }

    const characterPath = path.join(
      path.dirname(this.configPath),
      'characters',
      llmConfig.characterDefinition
    );

    try {
      const characterData = await fs.readFile(characterPath, 'utf8');
      const characterDefinition = JSON.parse(characterData);
      this.characterDefinitions[llmId] = characterDefinition;
      return characterDefinition;
    } catch (error) {
      throw new Error(`Failed to load character definition for ${llmId}: ${error.message}`);
    }
  }

  /**
   * Validate the configuration
   * @throws {Error} If the configuration is invalid
   */
  async validateConfig() {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    // Check required fields
    if (!this.config.llmProviders || !Array.isArray(this.config.llmProviders) || this.config.llmProviders.length < 2) {
      throw new Error('Configuration must include at least two LLM providers');
    }

    if (!this.config.conversation) {
      throw new Error('Configuration must include conversation settings');
    }

    if (!this.config.conversation.topic) {
      throw new Error('Conversation topic is required');
    }

    if (!this.config.conversation.numTurns || typeof this.config.conversation.numTurns !== 'number') {
      throw new Error('Number of turns must be a number');
    }

    // Validate LLM providers
    for (const provider of this.config.llmProviders) {
      if (!provider.id || !provider.provider || !provider.model || !provider.characterDefinition) {
        throw new Error('Each LLM provider must include id, provider, model, and characterDefinition');
      }

      // Check if character definition file exists
      const characterPath = path.join(
        path.dirname(this.configPath),
        'characters',
        provider.characterDefinition
      );
      
      const exists = await fs.pathExists(characterPath);
      if (!exists) {
        throw new Error(`Character definition file ${provider.characterDefinition} not found`);
      }
    }

    // Validate first speaker
    if (!this.config.conversation.firstSpeaker) {
      // Default to the first provider if not specified
      this.config.conversation.firstSpeaker = this.config.llmProviders[0].id;
    } else {
      const firstSpeakerExists = this.config.llmProviders.some(
        provider => provider.id === this.config.conversation.firstSpeaker
      );
      
      if (!firstSpeakerExists) {
        throw new Error(`First speaker ${this.config.conversation.firstSpeaker} not found in LLM providers`);
      }
    }

    // Set default values for optional fields
    if (!this.config.conversation.delayBetweenTurns) {
      this.config.conversation.delayBetweenTurns = 0;
    }

    if (!this.config.output) {
      this.config.output = {
        saveToFile: true,
        filePath: './output/conversation.json',
        displayInConsole: true,
        api: {
          enabled: false
        },
        web: {
          enabled: false
        }
      };
    }

    if (!this.config.errorHandling) {
      this.config.errorHandling = {
        strategy: 'retry',
        maxRetries: 3,
        initialDelay: 1000
      };
    }
  }

  /**
   * Get the loaded configuration
   * @returns {Object} The configuration
   * @throws {Error} If the configuration has not been loaded
   */
  getConfig() {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }
    return this.config;
  }

  /**
   * Get a character definition for an LLM
   * @param {string} llmId - The ID of the LLM
   * @returns {Object} The character definition
   * @throws {Error} If the character definition has not been loaded
   */
  getCharacterDefinition(llmId) {
    if (!this.characterDefinitions[llmId]) {
      throw new Error(`Character definition for ${llmId} not loaded`);
    }
    return this.characterDefinitions[llmId];
  }

  /**
   * Load all character definitions for configured LLMs
   * @returns {Object} A map of LLM IDs to character definitions
   */
  async loadAllCharacterDefinitions() {
    if (!this.config) {
      throw new Error('Configuration must be loaded before loading character definitions');
    }

    for (const provider of this.config.llmProviders) {
      await this.loadCharacterDefinition(provider.id);
    }

    return this.characterDefinitions;
  }
}

module.exports = ConfigurationManager;