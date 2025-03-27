const express = require('express');
const path = require('path');
const { ConversationSystem } = require('../src/index');

// Create Express app
const app = express();
app.use(express.json());

// Create conversation system
const configPath = path.join(__dirname, '../config/config.json');
const system = new ConversationSystem(configPath);

// Initialize the system
async function initializeSystem() {
  try {
    await system.initialize();
    console.log('Conversation system initialized successfully');
  } catch (error) {
    console.error('Failed to initialize conversation system:', error);
    process.exit(1);
  }
}

// API routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LLM Conversation System API',
    endpoints: [
      { method: 'GET', path: '/conversations', description: 'Get all conversations' },
      { method: 'GET', path: '/conversations/current', description: 'Get the current conversation' },
      { method: 'POST', path: '/conversations', description: 'Start a new conversation' },
      { method: 'GET', path: '/conversations/:id/export', description: 'Export a conversation' }
    ]
  });
});

// Get all conversations (placeholder for future implementation)
app.get('/conversations', (req, res) => {
  res.json([system.getConversationHistory()]);
});

// Get current conversation
app.get('/conversations/current', (req, res) => {
  res.json(system.getConversationHistory());
});

// Start a new conversation
app.post('/conversations', async (req, res) => {
  try {
    await system.startConversation();
    res.json({ status: 'success', message: 'Conversation started successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Export a conversation
app.get('/conversations/:id/export', (req, res) => {
  const format = req.query.format || 'json';
  const conversation = system.getConversationHistory();
  
  switch (format.toLowerCase()) {
    case 'json':
      res.json(conversation);
      break;
    
    case 'text':
      res.type('text/plain');
      let text = '';
      for (const turn of conversation) {
        text += `${turn.llmId}: ${turn.response}\n\n`;
      }
      res.send(text);
      break;
    
    case 'markdown':
      res.type('text/markdown');
      let markdown = '# LLM Conversation\n\n';
      for (const turn of conversation) {
        markdown += `## Turn ${turn.turn}: ${turn.llmId}\n\n${turn.response}\n\n`;
      }
      res.send(markdown);
      break;
    
    default:
      res.json(conversation);
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`API server listening on port ${PORT}`);
  await initializeSystem();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down API server...');
  process.exit(0);
});

// Export the app for testing
module.exports = app;