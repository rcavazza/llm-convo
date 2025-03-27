const providerFactory = require('./providers/provider-factory');

/**
 * Manages the conversation between LLMs
 */
class ConversationManager {
  /**
   * Create a new conversation manager
   * @param {Object} config - The configuration
   * @param {Object} characterDefinitions - The character definitions
   */
  constructor(config, characterDefinitions) {
    this.config = config;
    this.characterDefinitions = characterDefinitions;
    this.conversationHistory = [];
    this.providers = {};
    
    // Initialize providers
    for (const providerConfig of config.llmProviders) {
      this.providers[providerConfig.id] = providerFactory.createProvider(providerConfig);
    }
  }

  /**
   * Start the conversation
   * @returns {Promise<Array>} The conversation history
   */
  async startConversation() {
    const { numTurns, delayBetweenTurns, topic, firstSpeaker } = this.config.conversation;
    let currentSpeaker = firstSpeaker;
    
    console.log(`Starting conversation on topic: "${topic}"`);
    console.log(`First speaker: ${currentSpeaker}`);
    console.log(`Number of turns: ${numTurns}`);
    console.log(`Delay between turns: ${delayBetweenTurns}ms`);
    console.log('-------------------------------------------');
    
    for (let turn = 0; turn < numTurns; turn++) {
      console.log(`Turn ${turn + 1}/${numTurns} - Speaker: ${currentSpeaker}`);
      
      // Generate prompt for current speaker
      const prompt = this.generatePrompt(currentSpeaker, this.conversationHistory, topic);
      
      // Process the turn
      const response = await this.processTurn(currentSpeaker, prompt);
      
      // Add to conversation history
      this.conversationHistory.push({
        turn: turn + 1,
        llmId: currentSpeaker,
        prompt,
        response,
        timestamp: new Date().toISOString()
      });
      
      // Display the response
      console.log(`${currentSpeaker}: ${response}`);
      console.log('-------------------------------------------');
      
      // Switch speakers
      currentSpeaker = this.getNextSpeaker(currentSpeaker);
      
      // Wait for the configured delay before the next turn (except after the last turn)
      if (turn < numTurns - 1 && delayBetweenTurns > 0) {
        await this.waitForDelay(delayBetweenTurns);
      }
    }
    
    console.log('Conversation completed');
    return this.conversationHistory;
  }

  /**
   * Generate a prompt for an LLM
   * @param {string} llmId - The ID of the LLM
   * @param {Array} conversationHistory - The conversation history
   * @param {string} topic - The conversation topic
   * @returns {string} The generated prompt
   */
  generatePrompt(llmId, conversationHistory, topic) {
    const characterDefinition = this.characterDefinitions[llmId];
    
    if (!characterDefinition) {
      throw new Error(`Character definition for ${llmId} not found`);
    }
    
    let prompt = `The topic of conversation is: "${topic}"\n\n`;
    
    // Add conversation history to the prompt
    if (conversationHistory.length > 0) {
      prompt += "Previous conversation:\n";
      
      for (const turn of conversationHistory) {
        const speakerName = this.getLLMName(turn.llmId);
        prompt += `${speakerName}: ${turn.response}\n`;
      }
      
      prompt += "\n";
    }
    
    // Add instructions for the current turn
    const otherSpeakerId = this.getNextSpeaker(llmId);
    const otherSpeakerName = this.getLLMName(otherSpeakerId);
    
    if (conversationHistory.length === 0) {
      prompt += `You are starting the conversation on the topic "${topic}". Introduce your perspective on this topic.`;
    } else {
      prompt += `Continue the conversation by responding to ${otherSpeakerName}'s last message.`;
    }
    
    return prompt;
  }

  /**
   * Process a turn in the conversation
   * @param {string} llmId - The ID of the LLM
   * @param {string} prompt - The prompt for the LLM
   * @returns {Promise<string>} The LLM's response
   */
  async processTurn(llmId, prompt) {
    const provider = this.providers[llmId];
    
    if (!provider) {
      throw new Error(`Provider for ${llmId} not found`);
    }
    
    const characterDefinition = this.characterDefinitions[llmId];
    const systemPrompt = characterDefinition.systemPrompt;
    const parameters = provider.getProviderParameters(characterDefinition);
    
    try {
      const startTime = Date.now();
      const response = await provider.generateResponse(prompt, parameters, systemPrompt);
      const endTime = Date.now();
      
      console.log(`Response generated in ${endTime - startTime}ms`);
      
      return response;
    } catch (error) {
      console.error(`Error generating response for ${llmId}:`, error);
      return `[Error generating response: ${error.message}]`;
    }
  }

  /**
   * Get the next speaker in the conversation
   * @param {string} currentSpeaker - The current speaker
   * @returns {string} The next speaker
   */
  getNextSpeaker(currentSpeaker) {
    const speakers = this.config.llmProviders.map(provider => provider.id);
    const currentIndex = speakers.indexOf(currentSpeaker);
    
    if (currentIndex === -1) {
      throw new Error(`Speaker ${currentSpeaker} not found in LLM providers`);
    }
    
    const nextIndex = (currentIndex + 1) % speakers.length;
    return speakers[nextIndex];
  }

  /**
   * Get the name of an LLM
   * @param {string} llmId - The ID of the LLM
   * @returns {string} The name of the LLM
   */
  getLLMName(llmId) {
    const characterDefinition = this.characterDefinitions[llmId];
    
    if (characterDefinition && characterDefinition.name) {
      return characterDefinition.name;
    }
    
    return llmId;
  }

  /**
   * Wait for a delay
   * @param {number} delayMs - The delay in milliseconds
   * @returns {Promise} A promise that resolves after the delay
   */
  async waitForDelay(delayMs) {
    console.log(`Waiting for ${delayMs}ms before next turn...`);
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Get the conversation history
   * @returns {Array} The conversation history
   */
  getConversationHistory() {
    return this.conversationHistory;
  }
}

module.exports = ConversationManager;