const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Manages output of conversations
 */
class OutputManager {
  /**
   * Create a new output manager
   * @param {Object} config - The output configuration
   */
  constructor(config) {
    this.config = config;
    this.indexPath = path.join(process.cwd(), 'output', 'index.json');
  }

  /**
   * Generate a unique filename for a conversation
   * @param {Array} conversation - The conversation history
   * @returns {string} The generated filename
   */
  generateUniqueFilename(conversation) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    
    // Extract topic from the conversation if available
    let topic = '';
    if (conversation && conversation.length > 0 && conversation[0].prompt) {
      const topicMatch = conversation[0].prompt.match(/topic of conversation is: "([^"]+)"/);
      if (topicMatch && topicMatch[1]) {
        topic = topicMatch[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
      }
    }
    
    // Use the format specified in config, or default to timestamp_topic
    let filename = this.config.filenameFormat || '{timestamp}_{topic}';
    filename = filename
      .replace('{timestamp}', timestamp)
      .replace('{topic}', topic || 'untitled')
      .replace('{uuid}', uuidv4().substring(0, 8));
    
    return `${filename}.json`;
  }

  /**
   * Save a conversation to a file
   * @param {Array} conversation - The conversation history
   * @param {string} filePath - The path to save the file to (optional, uses generated path if not provided)
   * @returns {Promise<string>} The path the file was saved to
   */
  async saveToFile(conversation, filePath) {
    // If no specific path is provided, generate one based on the conversation
    const outputDir = this.config.directory || path.join(process.cwd(), 'output', 'conversations');
    const outputPath = filePath || path.join(outputDir, this.generateUniqueFilename(conversation));
    
    // Ensure the directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    // Format the conversation
    const formattedConversation = this.formatConversation(conversation, 'json');
    
    // Write to file
    await fs.writeFile(outputPath, formattedConversation, 'utf8');
    
    // Update the index
    await this.updateIndex(conversation, outputPath);
    
    console.log(`Conversation saved to ${outputPath}`);
    return outputPath;
  }

  /**
   * Update the index of conversations
   * @param {Array} conversation - The conversation history
   * @param {string} filePath - The path where the conversation was saved
   * @returns {Promise<void>}
   */
  async updateIndex(conversation, filePath) {
    // Create metadata for the conversation
    const metadata = {
      id: path.basename(filePath, '.json'),
      filename: path.basename(filePath),
      topic: this.extractTopic(conversation),
      participants: this.extractParticipants(conversation),
      turns: conversation.length,
      timestamp: new Date().toISOString()
    };
    
    // Ensure the index directory exists
    await fs.ensureDir(path.dirname(this.indexPath));
    
    // Load existing index or create a new one
    let index = [];
    try {
      if (await fs.pathExists(this.indexPath)) {
        const indexContent = await fs.readFile(this.indexPath, 'utf8');
        index = JSON.parse(indexContent);
      }
    } catch (error) {
      console.warn(`Error reading index file: ${error.message}. Creating a new index.`);
    }
    
    // Add the new conversation metadata to the index
    index.push(metadata);
    
    // Write the updated index
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  /**
   * Extract the topic from a conversation
   * @param {Array} conversation - The conversation history
   * @returns {string} The extracted topic
   */
  extractTopic(conversation) {
    if (conversation && conversation.length > 0 && conversation[0].prompt) {
      const topicMatch = conversation[0].prompt.match(/topic of conversation is: "([^"]+)"/);
      if (topicMatch && topicMatch[1]) {
        return topicMatch[1];
      }
    }
    return 'Untitled Conversation';
  }

  /**
   * Extract the participants from a conversation
   * @param {Array} conversation - The conversation history
   * @returns {Array<string>} The list of participants
   */
  extractParticipants(conversation) {
    if (!conversation || conversation.length === 0) {
      return [];
    }
    
    // Extract unique participant IDs
    const participants = new Set();
    for (const turn of conversation) {
      if (turn.llmId) {
        participants.add(turn.llmId);
      }
    }
    
    return Array.from(participants);
  }

  /**
   * List all saved conversations
   * @returns {Promise<Array>} The list of conversation metadata
   */
  async listSavedConversations() {
    try {
      if (await fs.pathExists(this.indexPath)) {
        const indexContent = await fs.readFile(this.indexPath, 'utf8');
        return JSON.parse(indexContent);
      }
    } catch (error) {
      console.error(`Error listing conversations: ${error.message}`);
    }
    
    return [];
  }

  /**
   * Load a conversation from a file
   * @param {string} filename - The filename or ID of the conversation to load
   * @returns {Promise<Array>} The loaded conversation
   */
  async loadConversation(filename) {
    // Determine the full path to the conversation file
    const outputDir = this.config.directory || path.join(process.cwd(), 'output', 'conversations');
    
    // If the filename doesn't end with .json, assume it's an ID and add the extension
    const fullFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    const filePath = path.join(outputDir, fullFilename);
    
    try {
      if (await fs.pathExists(filePath)) {
        const content = await fs.readFile(filePath, 'utf8');
        return JSON.parse(content);
      } else {
        throw new Error(`Conversation file not found: ${filePath}`);
      }
    } catch (error) {
      console.error(`Error loading conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Display a conversation in the console
   * @param {Array} conversation - The conversation history
   */
  displayInConsole(conversation) {
    if (!this.config.displayInConsole) {
      return;
    }
    
    console.log('\n=== Conversation Summary ===');
    console.log(`Total turns: ${conversation.length}`);
    console.log('---------------------------');
    
    for (const turn of conversation) {
      console.log(`Turn ${turn.turn}: ${turn.llmId}`);
      console.log(`Response: ${turn.response.substring(0, 100)}${turn.response.length > 100 ? '...' : ''}`);
      console.log('---------------------------');
    }
  }

  /**
   * Format a conversation for output
   * @param {Array} conversation - The conversation history
   * @param {string} format - The format to output in (json, text, etc.)
   * @returns {string} The formatted conversation
   */
  formatConversation(conversation, format = 'json') {
    switch (format.toLowerCase()) {
      case 'json':
        return JSON.stringify(conversation, null, 2);
      
      case 'text':
        let output = '';
        for (const turn of conversation) {
          output += `${turn.llmId}: ${turn.response}\n\n`;
        }
        return output;
      
      case 'markdown':
        let markdown = '# LLM Conversation\n\n';
        for (const turn of conversation) {
          markdown += `## Turn ${turn.turn}: ${turn.llmId}\n\n${turn.response}\n\n`;
        }
        return markdown;
      
      default:
        return JSON.stringify(conversation, null, 2);
    }
  }

  /**
   * Setup API endpoint for retrieving conversations
   * @param {Object} app - The Express app
   * @param {Function} getConversationHistory - Function to get the conversation history
   */
  setupAPIEndpoint(app, getConversationHistory) {
    if (!this.config.api || !this.config.api.enabled) {
      return;
    }
    
    const port = this.config.api.port || 3000;
    
    // Get current conversation
    app.get('/conversations/current', (req, res) => {
      const format = req.query.format || 'json';
      const conversation = getConversationHistory();
      const formatted = this.formatConversation(conversation, format);
      
      if (format === 'json') {
        res.json(conversation);
      } else {
        res.type(format === 'markdown' ? 'text/markdown' : 'text/plain');
        res.send(formatted);
      }
    });
    
    // List all conversations
    app.get('/conversations', async (req, res) => {
      try {
        const conversations = await this.listSavedConversations();
        res.json(conversations);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Get a specific conversation
    app.get('/conversations/:id', async (req, res) => {
      try {
        const conversation = await this.loadConversation(req.params.id);
        
        const format = req.query.format || 'json';
        const formatted = this.formatConversation(conversation, format);
        
        if (format === 'json') {
          res.json(conversation);
        } else {
          res.type(format === 'markdown' ? 'text/markdown' : 'text/plain');
          res.send(formatted);
        }
      } catch (error) {
        res.status(404).json({ error: error.message });
      }
    });
    
    app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  }
}

module.exports = OutputManager;