const fs = require('fs-extra');
const path = require('path');

/**
 * Repository for managing conversation files
 */
class ConversationRepository {
  /**
   * Create a new conversation repository
   * @param {OutputManager} outputManager - The output manager
   */
  constructor(outputManager) {
    this.outputManager = outputManager;
    this.indexPath = path.join(process.cwd(), 'output', 'index.json');
  }

  /**
   * Save a conversation
   * @param {Array} conversation - The conversation history
   * @returns {Promise<string>} The path the conversation was saved to
   */
  async saveConversation(conversation) {
    return this.outputManager.saveToFile(conversation);
  }

  /**
   * List all conversations
   * @returns {Promise<Array>} The list of conversation metadata
   */
  async listConversations() {
    return this.outputManager.listSavedConversations();
  }

  /**
   * Get a conversation by ID
   * @param {string} id - The ID of the conversation
   * @returns {Promise<Array>} The conversation
   */
  async getConversation(id) {
    return this.outputManager.loadConversation(id);
  }

  /**
   * Delete a conversation
   * @param {string} id - The ID of the conversation to delete
   * @returns {Promise<boolean>} Whether the deletion was successful
   */
  async deleteConversation(id) {
    try {
      // Get the list of conversations
      const conversations = await this.listConversations();
      
      // Find the conversation with the given ID
      const conversation = conversations.find(c => c.id === id);
      
      if (!conversation) {
        throw new Error(`Conversation with ID ${id} not found`);
      }
      
      // Determine the full path to the conversation file
      const outputDir = this.outputManager.config.directory || path.join(process.cwd(), 'output', 'conversations');
      const filePath = path.join(outputDir, conversation.filename);
      
      // Delete the file
      await fs.remove(filePath);
      
      // Update the index
      const updatedConversations = conversations.filter(c => c.id !== id);
      await fs.writeFile(this.indexPath, JSON.stringify(updatedConversations, null, 2), 'utf8');
      
      return true;
    } catch (error) {
      console.error(`Error deleting conversation: ${error.message}`);
      return false;
    }
  }

  /**
   * Search conversations by query
   * @param {string} query - The search query
   * @returns {Promise<Array>} The list of matching conversation metadata
   */
  async searchConversations(query) {
    if (!query) {
      return this.listConversations();
    }
    
    const conversations = await this.listConversations();
    const lowerQuery = query.toLowerCase();
    
    return conversations.filter(conversation => {
      // Search in topic
      if (conversation.topic && conversation.topic.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in participants
      if (conversation.participants && conversation.participants.some(p => p.toLowerCase().includes(lowerQuery))) {
        return true;
      }
      
      // Search in ID
      if (conversation.id && conversation.id.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      return false;
    });
  }

  /**
   * Get the most recent conversations
   * @param {number} limit - The maximum number of conversations to return
   * @returns {Promise<Array>} The list of recent conversation metadata
   */
  async getRecentConversations(limit = 10) {
    const conversations = await this.listConversations();
    
    // Sort by timestamp (most recent first)
    conversations.sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;
    });
    
    // Return the most recent conversations
    return conversations.slice(0, limit);
  }
}

module.exports = ConversationRepository;