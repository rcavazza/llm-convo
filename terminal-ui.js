#!/usr/bin/env node

const path = require('path');
const blessed = require('blessed');
const chalk = require('chalk');
const { ConversationSystem } = require('./src/index');
const fs = require('fs-extra');

/**
 * Terminal UI for the LLM Conversation System
 */
class TerminalUI {
  /**
   * Create a new terminal UI
   * @param {string} configPath - Path to the configuration file
   */
  constructor(configPath) {
    this.configPath = configPath || path.join(__dirname, 'config/config.json');
    this.system = new ConversationSystem(this.configPath);
    this.screen = null;
    this.mainBox = null;
    this.listBox = null;
    this.detailBox = null;
    this.statusBar = null;
    this.helpBar = null;
    this.conversations = [];
    this.selectedIndex = 0;
    this.currentView = 'list'; // 'list' or 'detail'
    this.currentConversation = null;
    this.colors = {
      primary: '#36c5f0',
      secondary: '#2eb67d',
      accent: '#e01e5a',
      background: '#1a1d21',
      text: '#f2f3f5'
    };
  }

  /**
   * Initialize the terminal UI
   */
  async initialize() {
    try {
      // Initialize the conversation system
      await this.system.initialize();
      
      // Load terminal UI colors from config if available
      const config = this.system.configManager.getConfig();
      if (config.output.terminal && config.output.terminal.colors) {
        this.colors = { ...this.colors, ...config.output.terminal.colors };
      }
      
      // Create the blessed screen
      this.screen = blessed.screen({
        smartCSR: true,
        title: 'LLM Conversation System',
        cursor: {
          artificial: true,
          shape: 'line',
          blink: true,
          color: this.colors.primary
        }
      });
      
      // Create the main container
      this.mainBox = blessed.box({
        top: 0,
        left: 0,
        width: '100%',
        height: '100%-2',
        border: {
          type: 'line'
        },
        style: {
          border: {
            fg: this.colors.primary
          }
        }
      });
      
      // Create the status bar
      this.statusBar = blessed.box({
        bottom: 1,
        left: 0,
        width: '100%',
        height: 1,
        content: ' LLM Conversation System',
        style: {
          fg: this.colors.text,
          bg: this.colors.primary
        }
      });
      
      // Create the help bar
      this.helpBar = blessed.box({
        bottom: 0,
        left: 0,
        width: '100%',
        height: 1,
        content: ' [↑/↓] Navigate  [Enter] Select  [d] Delete  [e] Export  [s] Search  [q] Quit',
        style: {
          fg: this.colors.text,
          bg: this.colors.secondary
        }
      });
      
      // Add components to the screen
      this.screen.append(this.mainBox);
      this.screen.append(this.statusBar);
      this.screen.append(this.helpBar);
      
      // Create the list view
      this.createListView();
      
      // Load conversations
      await this.loadConversations();
      
      // Set key bindings
      this.setKeyBindings();
      
      // Render the screen
      this.screen.render();
      
      // Set the status message
      this.setStatus('Ready');
    } catch (error) {
      console.error('Failed to initialize terminal UI:', error);
      process.exit(1);
    }
  }

  /**
   * Create the list view
   */
  createListView() {
    // Create the list box
    this.listBox = blessed.list({
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      keys: true,
      vi: true,
      mouse: true,
      border: {
        type: 'line'
      },
      style: {
        selected: {
          bg: this.colors.primary,
          fg: this.colors.text
        },
        border: {
          fg: this.colors.secondary
        }
      },
      scrollbar: {
        ch: '█',
        style: {
          bg: this.colors.secondary
        }
      }
    });
    
    // Add the list box to the main container
    this.mainBox.append(this.listBox);
    
    // Set the title
    this.mainBox.setContent(` ${chalk.bold('LLM Conversations')} `);
    
    // Focus the list box
    this.listBox.focus();
  }

  /**
   * Create the detail view
   */
  createDetailView() {
    // Create the detail box
    this.detailBox = blessed.box({
      top: 1,
      left: 1,
      width: '100%-2',
      height: '100%-2',
      keys: true,
      vi: true,
      mouse: true,
      scrollable: true,
      alwaysScroll: true,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: this.colors.secondary
        }
      },
      scrollbar: {
        ch: '█',
        style: {
          bg: this.colors.secondary
        }
      }
    });
    
    // Add the detail box to the main container
    this.mainBox.append(this.detailBox);
    
    // Focus the detail box
    this.detailBox.focus();
  }

  /**
   * Load conversations from the repository
   */
  async loadConversations() {
    try {
      // Show loading message
      this.setStatus('Loading conversations...');
      
      // Get conversations from the repository
      this.conversations = await this.system.conversationRepository.getRecentConversations(100);
      
      // Update the list
      this.updateConversationList();
      
      // Set status message
      this.setStatus(`Loaded ${this.conversations.length} conversations`);
    } catch (error) {
      this.setStatus(`Error loading conversations: ${error.message}`);
    }
  }

  /**
   * Update the conversation list
   */
  updateConversationList() {
    // Clear the list
    this.listBox.clearItems();
    
    // Add conversations to the list
    if (this.conversations.length === 0) {
      this.listBox.pushItem('No conversations found');
    } else {
      for (const conversation of this.conversations) {
        const date = new Date(conversation.timestamp).toLocaleString();
        const topic = conversation.topic || 'Untitled';
        const turns = conversation.turns || 0;
        
        this.listBox.pushItem(`${date} | ${topic} (${turns} turns)`);
      }
      
      // Select the first item
      this.listBox.select(this.selectedIndex);
    }
    
    // Render the screen
    this.screen.render();
  }

  /**
   * View a conversation
   * @param {number} index - The index of the conversation to view
   */
  async viewConversation(index) {
    try {
      if (index < 0 || index >= this.conversations.length) {
        return;
      }
      
      // Set status message
      this.setStatus('Loading conversation...');
      
      // Get the conversation
      const metadata = this.conversations[index];
      const conversation = await this.system.conversationRepository.getConversation(metadata.id);
      
      // Switch to detail view
      this.switchToDetailView();
      
      // Set the conversation
      this.currentConversation = conversation;
      
      // Display the conversation
      this.displayConversation(conversation, metadata);
      
      // Set status message
      this.setStatus(`Viewing conversation: ${metadata.topic}`);
    } catch (error) {
      this.setStatus(`Error viewing conversation: ${error.message}`);
    }
  }

  /**
   * Display a conversation in the detail view
   * @param {Array} conversation - The conversation to display
   * @param {Object} metadata - The conversation metadata
   */
  displayConversation(conversation, metadata) {
    // Set the title
    this.mainBox.setContent(` ${chalk.bold(metadata.topic || 'Untitled Conversation')} `);
    
    // Create the content
    let content = '';
    
    // Add metadata
    content += `${chalk.bold('Date:')} ${new Date(metadata.timestamp).toLocaleString()}\n`;
    content += `${chalk.bold('Participants:')} ${metadata.participants.join(', ')}\n`;
    content += `${chalk.bold('Turns:')} ${metadata.turns}\n\n`;
    
    // Add conversation turns
    for (const turn of conversation) {
      const speaker = turn.llmId;
      const response = turn.response;
      
      content += `${chalk.bold(`Turn ${turn.turn}: ${speaker}`)}\n`;
      content += `${response}\n\n`;
    }
    
    // Set the content
    this.detailBox.setContent(content);
    
    // Scroll to the top
    this.detailBox.scrollTo(0);
    
    // Render the screen
    this.screen.render();
  }

  /**
   * Switch to list view
   */
  switchToListView() {
    // Remove the detail box if it exists
    if (this.detailBox) {
      this.mainBox.remove(this.detailBox);
      this.detailBox = null;
    }
    
    // Create the list view if it doesn't exist
    if (!this.listBox) {
      this.createListView();
    }
    
    // Set the current view
    this.currentView = 'list';
    
    // Update the help bar
    this.helpBar.setContent(' [↑/↓] Navigate  [Enter] Select  [d] Delete  [e] Export  [s] Search  [q] Quit');
    
    // Render the screen
    this.screen.render();
  }

  /**
   * Switch to detail view
   */
  switchToDetailView() {
    // Remove the list box if it exists
    if (this.listBox) {
      this.mainBox.remove(this.listBox);
      this.listBox = null;
    }
    
    // Create the detail view if it doesn't exist
    if (!this.detailBox) {
      this.createDetailView();
    }
    
    // Set the current view
    this.currentView = 'detail';
    
    // Update the help bar
    this.helpBar.setContent(' [b] Back  [e] Export  [q] Quit');
    
    // Render the screen
    this.screen.render();
  }

  /**
   * Delete a conversation
   * @param {number} index - The index of the conversation to delete
   */
  async deleteConversation(index) {
    try {
      if (index < 0 || index >= this.conversations.length) {
        return;
      }
      
      // Get the conversation
      const metadata = this.conversations[index];
      
      // Show confirmation dialog
      this.showConfirmDialog(`Delete conversation "${metadata.topic}"?`, async (confirmed) => {
        if (confirmed) {
          // Set status message
          this.setStatus('Deleting conversation...');
          
          // Delete the conversation
          await this.system.conversationRepository.deleteConversation(metadata.id);
          
          // Reload conversations
          await this.loadConversations();
          
          // Set status message
          this.setStatus('Conversation deleted');
        }
      });
    } catch (error) {
      this.setStatus(`Error deleting conversation: ${error.message}`);
    }
  }

  /**
   * Export a conversation
   * @param {number} index - The index of the conversation to export
   */
  async exportConversation(index) {
    try {
      let conversation;
      let metadata;
      
      if (this.currentView === 'list') {
        if (index < 0 || index >= this.conversations.length) {
          return;
        }
        
        // Get the conversation
        metadata = this.conversations[index];
        conversation = await this.system.conversationRepository.getConversation(metadata.id);
      } else {
        // Use the current conversation
        conversation = this.currentConversation;
        metadata = this.conversations[this.selectedIndex];
      }
      
      // Show export dialog
      this.showExportDialog(async (format) => {
        if (!format) {
          return;
        }
        
        // Set status message
        this.setStatus(`Exporting conversation to ${format}...`);
        
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const topic = (metadata.topic || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 30);
        const filename = `${timestamp}_${topic}.${format}`;
        const outputPath = path.join(__dirname, 'output', filename);
        
        // Export the conversation
        await this.system.exportManager.exportConversation(conversation, format, outputPath);
        
        // Set status message
        this.setStatus(`Conversation exported to ${outputPath}`);
      });
    } catch (error) {
      this.setStatus(`Error exporting conversation: ${error.message}`);
    }
  }

  /**
   * Search conversations
   */
  async searchConversations() {
    // Show search dialog
    this.showInputDialog('Search conversations:', async (query) => {
      if (!query) {
        return;
      }
      
      // Set status message
      this.setStatus(`Searching for "${query}"...`);
      
      // Search conversations
      this.conversations = await this.system.conversationRepository.searchConversations(query);
      
      // Update the list
      this.updateConversationList();
      
      // Set status message
      this.setStatus(`Found ${this.conversations.length} conversations matching "${query}"`);
    });
  }

  /**
   * Show a confirmation dialog
   * @param {string} message - The message to display
   * @param {Function} callback - The callback function
   */
  showConfirmDialog(message, callback) {
    const dialog = blessed.question({
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: this.colors.accent
        }
      }
    });
    
    // Add the dialog to the screen
    this.screen.append(dialog);
    
    // Show the dialog
    dialog.ask(message, (err, confirmed) => {
      // Remove the dialog
      this.screen.remove(dialog);
      
      // Render the screen
      this.screen.render();
      
      // Call the callback
      callback(confirmed);
    });
  }

  /**
   * Show an input dialog
   * @param {string} message - The message to display
   * @param {Function} callback - The callback function
   */
  showInputDialog(message, callback) {
    const dialog = blessed.prompt({
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      border: {
        type: 'line'
      },
      style: {
        border: {
          fg: this.colors.accent
        }
      }
    });
    
    // Add the dialog to the screen
    this.screen.append(dialog);
    
    // Show the dialog
    dialog.input(message, '', (err, value) => {
      // Remove the dialog
      this.screen.remove(dialog);
      
      // Render the screen
      this.screen.render();
      
      // Call the callback
      callback(value);
    });
  }

  /**
   * Show an export dialog
   * @param {Function} callback - The callback function
   */
  showExportDialog(callback) {
    const dialog = blessed.list({
      top: 'center',
      left: 'center',
      width: 50,
      height: 10,
      border: {
        type: 'line'
      },
      style: {
        selected: {
          bg: this.colors.primary,
          fg: this.colors.text
        },
        border: {
          fg: this.colors.accent
        }
      },
      items: [
        'JSON',
        'Text',
        'Markdown',
        'HTML',
        'Cancel'
      ]
    });
    
    // Add the dialog to the screen
    this.screen.append(dialog);
    
    // Set the title
    dialog.setLabel(' Export Format ');
    
    // Focus the dialog
    dialog.focus();
    
    // Handle selection
    dialog.on('select', (item, index) => {
      // Remove the dialog
      this.screen.remove(dialog);
      
      // Render the screen
      this.screen.render();
      
      // Call the callback with the selected format
      if (index === 4) { // Cancel
        callback(null);
      } else {
        const formats = ['json', 'text', 'markdown', 'html'];
        callback(formats[index]);
      }
    });
    
    // Render the screen
    this.screen.render();
  }

  /**
   * Set the status message
   * @param {string} message - The message to display
   */
  setStatus(message) {
    this.statusBar.setContent(` ${message}`);
    this.screen.render();
  }

  /**
   * Set key bindings
   */
  setKeyBindings() {
    // Quit on q or Ctrl-C
    this.screen.key(['q', 'C-c'], () => {
      process.exit(0);
    });
    
    // Handle key events
    this.screen.key(['up', 'down', 'enter', 'b', 'd', 'e', 's'], (ch, key) => {
      if (this.currentView === 'list') {
        switch (key.name) {
          case 'up':
            this.listBox.up();
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
            break;
          
          case 'down':
            this.listBox.down();
            this.selectedIndex = Math.min(this.conversations.length - 1, this.selectedIndex + 1);
            break;
          
          case 'enter':
            this.viewConversation(this.selectedIndex);
            break;
          
          case 'd':
            this.deleteConversation(this.selectedIndex);
            break;
          
          case 'e':
            this.exportConversation(this.selectedIndex);
            break;
          
          case 's':
            this.searchConversations();
            break;
        }
      } else if (this.currentView === 'detail') {
        switch (key.name) {
          case 'b':
            this.switchToListView();
            break;
          
          case 'e':
            this.exportConversation(this.selectedIndex);
            break;
          
          case 'up':
            this.detailBox.scroll(-1);
            break;
          
          case 'down':
            this.detailBox.scroll(1);
            break;
        }
      }
      
      // Render the screen
      this.screen.render();
    });
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const configPath = args[0];

// Create and run the terminal UI
const ui = new TerminalUI(configPath);

ui.initialize()
  .catch(error => {
    console.error('Error initializing terminal UI:', error);
    process.exit(1);
  });