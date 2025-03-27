const fs = require('fs-extra');
const path = require('path');

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
  }

  /**
   * Save a conversation to a file
   * @param {Array} conversation - The conversation history
   * @param {string} filePath - The path to save the file to (optional, uses config if not provided)
   * @returns {Promise<string>} The path the file was saved to
   */
  async saveToFile(conversation, filePath) {
    const outputPath = filePath || this.config.filePath;
    
    // Ensure the directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    // Format the conversation
    const formattedConversation = this.formatConversation(conversation, 'json');
    
    // Write to file
    await fs.writeFile(outputPath, formattedConversation, 'utf8');
    
    console.log(`Conversation saved to ${outputPath}`);
    return outputPath;
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
    
    app.get('/conversations', (req, res) => {
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
    
    app.listen(port, () => {
      console.log(`API server listening on port ${port}`);
    });
  }
}

module.exports = OutputManager;