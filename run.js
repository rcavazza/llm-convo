#!/usr/bin/env node

const path = require('path');
const { ConversationSystem } = require('./src/index');

// Parse command line arguments
const args = process.argv.slice(2);
const configPath = args[0] || path.join(__dirname, 'config/config.json');

// Create and run the conversation system
const system = new ConversationSystem(configPath);

console.log('LLM Conversation System');
console.log('======================');
console.log(`Using configuration: ${configPath}`);
console.log('');

system.startConversation()
  .then(() => {
    console.log('');
    console.log('Conversation completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during conversation:', error);
    process.exit(1);
  });