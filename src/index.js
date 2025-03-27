const path = require('path');
const express = require('express');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import components
const ConfigurationManager = require('./config-manager');
const ConversationManager = require('./conversation-manager');
const OutputManager = require('./output-manager');
const ErrorHandler = require('./error-handler');
const TemplateManager = require('./template-manager');
const ExportManager = require('./export-manager');

/**
 * Main conversation system class
 */
class ConversationSystem {
  /**
   * Create a new conversation system
   * @param {string} configPath - Path to the configuration file
   */
  constructor(configPath) {
    this.configPath = configPath || path.join(__dirname, '../config/config.json');
    this.configManager = new ConfigurationManager(this.configPath);
    this.templatesDir = path.join(path.dirname(this.configPath), 'templates');
    this.conversationManager = null;
    this.outputManager = null;
    this.errorHandler = null;
    this.templateManager = null;
    this.exportManager = null;
  }

  /**
   * Initialize the system
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Load configuration
      console.log(`Loading configuration from ${this.configPath}...`);
      const config = await this.configManager.loadConfig();
      
      // Load character definitions
      console.log('Loading character definitions...');
      const characterDefinitions = await this.configManager.loadAllCharacterDefinitions();
      
      // Initialize components
      this.conversationManager = new ConversationManager(config, characterDefinitions);
      this.outputManager = new OutputManager(config.output);
      this.errorHandler = new ErrorHandler(config.errorHandling);
      this.templateManager = new TemplateManager(this.templatesDir);
      this.exportManager = new ExportManager();
      
      // Load template if specified in config
      if (config.conversation.template) {
        console.log(`Loading template: ${config.conversation.template}`);
        await this.templateManager.loadTemplate(config.conversation.template);
      }
      
      // Setup API if enabled
      if (config.output.api && config.output.api.enabled) {
        this.setupAPI();
      }
      
      console.log('System initialized successfully');
    } catch (error) {
      console.error('Failed to initialize system:', error);
      throw error;
    }
  }

  /**
   * Start the conversation
   * @returns {Promise<Array>} The conversation history
   */
  async startConversation(customConfig = null) {
    if (!this.conversationManager) {
      await this.initialize();
    }
    
    try {
      const config = this.configManager.getConfig();
      
      // Apply custom configuration if provided
      if (customConfig) {
        Object.assign(config.conversation, customConfig);
      }
      
      // Apply template if specified
      if (config.conversation.template) {
        const template = await this.templateManager.loadTemplate(config.conversation.template);
        const appliedTemplate = this.templateManager.applyTemplate(template, config.conversation.topic);
        
        console.log(`Applied template: ${template.name}`);
        
        // TODO: Implement template-based conversation flow
        // For now, we'll just use the regular conversation flow
      }
      
      // Start the conversation
      const conversation = await this.conversationManager.startConversation();
      
      // Handle output
      if (config.output.saveToFile) {
        await this.outputManager.saveToFile(conversation);
      }
      
      if (config.output.displayInConsole) {
        this.outputManager.displayInConsole(conversation);
      }
      
      // Export in default format if specified
      if (config.output.exportFormat) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `conversation-${timestamp}.${config.output.exportFormat}`;
        const outputPath = path.join(__dirname, '../output', filename);
        
        await this.exportManager.exportConversation(
          conversation,
          config.output.exportFormat,
          outputPath
        );
      }
      
      return conversation;
    } catch (error) {
      console.error('Error during conversation:', error);
      throw error;
    }
  }

  /**
   * Setup the API server
   */
  setupAPI() {
    const app = express();
    const config = this.configManager.getConfig();
    
    app.use(express.json());
    
    // Setup API endpoints
    this.outputManager.setupAPIEndpoint(app, () => {
      return this.conversationManager ? this.conversationManager.getConversationHistory() : [];
    });
    
    // Add endpoint to start a new conversation
    app.post('/conversations', async (req, res) => {
      try {
        await this.startConversation();
        res.json({ status: 'success', message: 'Conversation started' });
      } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    });
    
    // Add template endpoints
    app.get('/templates', async (req, res) => {
      try {
        const templates = await this.templateManager.listTemplates();
        res.json(templates);
      } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    });
    
    app.get('/templates/:id', async (req, res) => {
      try {
        const template = await this.templateManager.loadTemplate(req.params.id);
        res.json(template);
      } catch (error) {
        res.status(404).json({ status: 'error', message: error.message });
      }
    });
    
    // Add export endpoint
    app.get('/conversations/export', async (req, res) => {
      try {
        const format = req.query.format || 'json';
        const conversation = this.conversationManager.getConversationHistory();
        
        if (req.query.download) {
          // Export to file and send as download
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `conversation-${timestamp}.${format}`;
          const outputPath = path.join(__dirname, '../output', filename);
          
          await this.exportManager.exportConversation(conversation, format, outputPath);
          
          res.download(outputPath);
        } else {
          // Send formatted content directly
          const content = this.exportManager.formatConversation(conversation, format);
          
          if (format === 'json') {
            res.json(JSON.parse(content));
          } else if (format === 'html') {
            res.type('html').send(content);
          } else if (format === 'markdown') {
            res.type('text/markdown').send(content);
          } else {
            res.type('text/plain').send(content);
          }
        }
      } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
      }
    });
  }

  /**
   * Get the conversation history
   * @returns {Array} The conversation history
   */
  getConversationHistory() {
    return this.conversationManager ? this.conversationManager.getConversationHistory() : [];
  }
}

// Export the class
module.exports = { ConversationSystem };

// If this file is run directly, start a conversation
if (require.main === module) {
  const configPath = process.argv[2] || path.join(__dirname, '../config/config.json');
  const system = new ConversationSystem(configPath);
  
  system.startConversation()
    .then(() => {
      console.log('Conversation completed successfully');
    })
    .catch(error => {
      console.error('Error during conversation:', error);
      process.exit(1);
    });
}