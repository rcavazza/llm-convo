const fs = require('fs-extra');
const path = require('path');

/**
 * Manages exporting conversations in different formats
 */
class ExportManager {
  /**
   * Create a new export manager
   */
  constructor() {
    this.supportedFormats = ['json', 'text', 'markdown', 'html'];
  }

  /**
   * Export a conversation in the specified format
   * @param {Array} conversation - The conversation history
   * @param {string} format - The format to export in
   * @param {string} outputPath - The path to save the exported file to
   * @returns {Promise<string>} The path the file was saved to
   * @throws {Error} If the export fails
   */
  async exportConversation(conversation, format, outputPath) {
    if (!this.supportedFormats.includes(format.toLowerCase())) {
      throw new Error(`Format ${format} is not supported`);
    }
    
    // Ensure the directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    // Format the conversation
    const formattedContent = this.formatConversation(conversation, format);
    
    // Write to file
    await fs.writeFile(outputPath, formattedContent, 'utf8');
    
    console.log(`Conversation exported to ${outputPath} in ${format} format`);
    return outputPath;
  }

  /**
   * Get the list of supported formats
   * @returns {Array<string>} The list of supported formats
   */
  getSupportedFormats() {
    return [...this.supportedFormats];
  }

  /**
   * Format a conversation in the specified format
   * @param {Array} conversation - The conversation history
   * @param {string} format - The format to format in
   * @returns {string} The formatted conversation
   */
  formatConversation(conversation, format) {
    switch (format.toLowerCase()) {
      case 'json':
        return this.formatToJSON(conversation);
      
      case 'text':
        return this.formatToPlainText(conversation);
      
      case 'markdown':
        return this.formatToMarkdown(conversation);
      
      case 'html':
        return this.formatToHTML(conversation);
      
      default:
        return this.formatToJSON(conversation);
    }
  }

  /**
   * Format a conversation as JSON
   * @param {Array} conversation - The conversation history
   * @returns {string} The formatted conversation
   */
  formatToJSON(conversation) {
    return JSON.stringify(conversation, null, 2);
  }

  /**
   * Format a conversation as plain text
   * @param {Array} conversation - The conversation history
   * @returns {string} The formatted conversation
   */
  formatToPlainText(conversation) {
    let output = 'LLM CONVERSATION\n\n';
    
    for (const turn of conversation) {
      output += `Turn ${turn.turn}: ${turn.llmId}\n`;
      output += `${turn.response}\n\n`;
    }
    
    return output;
  }

  /**
   * Format a conversation as Markdown
   * @param {Array} conversation - The conversation history
   * @returns {string} The formatted conversation
   */
  formatToMarkdown(conversation) {
    let output = '# LLM Conversation\n\n';
    
    for (const turn of conversation) {
      output += `## Turn ${turn.turn}: ${turn.llmId}\n\n`;
      output += `${turn.response}\n\n`;
    }
    
    return output;
  }

  /**
   * Format a conversation as HTML
   * @param {Array} conversation - The conversation history
   * @returns {string} The formatted conversation
   */
  formatToHTML(conversation) {
    let output = `<!DOCTYPE html>
<html>
<head>
  <title>LLM Conversation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    .turn {
      margin-bottom: 30px;
      padding: 15px;
      border-radius: 5px;
    }
    .turn:nth-child(odd) {
      background-color: #f5f5f5;
    }
    .turn-header {
      font-weight: bold;
      margin-bottom: 10px;
      color: #333;
    }
    .turn-content {
      white-space: pre-wrap;
    }
    .metadata {
      font-size: 0.8em;
      color: #666;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <h1>LLM Conversation</h1>
`;
    
    for (const turn of conversation) {
      output += `  <div class="turn">
    <div class="turn-header">Turn ${turn.turn}: ${turn.llmId}</div>
    <div class="turn-content">${this.escapeHTML(turn.response)}</div>
    <div class="metadata">Timestamp: ${turn.timestamp}</div>
  </div>
`;
    }
    
    output += `</body>
</html>`;
    
    return output;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - The text to escape
   * @returns {string} The escaped text
   */
  escapeHTML(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
}

module.exports = ExportManager;