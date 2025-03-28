const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const { ConversationSystem } = require('../src/index');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
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
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await system.conversationRepository.listConversations();
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/conversations/current', (req, res) => {
  res.json(system.getConversationHistory());
});

app.get('/api/conversations/:id', async (req, res) => {
  try {
    const conversation = await system.conversationRepository.getConversation(req.params.id);
    res.json(conversation);
  } catch (error) {
    res.status(404).json({ status: 'error', message: error.message });
  }
});

app.post('/api/conversations', async (req, res) => {
  try {
    // Start a new conversation with custom config if provided
    await system.startConversation(req.body);
    res.json({ status: 'success', message: 'Conversation started successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const success = await system.conversationRepository.deleteConversation(req.params.id);
    if (success) {
      res.json({ status: 'success', message: 'Conversation deleted' });
    } else {
      res.status(404).json({ status: 'error', message: 'Conversation not found' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/conversations/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    const conversations = await system.conversationRepository.searchConversations(query);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/templates', async (req, res) => {
  try {
    const templates = await system.templateManager.listTemplates();
    res.json(templates);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/export/:id', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const conversation = await system.conversationRepository.getConversation(req.params.id);
    const content = system.exportManager.formatConversation(conversation, format);
    
    if (format === 'json') {
      res.json(JSON.parse(content));
    } else if (format === 'html') {
      res.type('html').send(content);
    } else if (format === 'markdown') {
      res.type('text/markdown').send(content);
    } else {
      res.type('text/plain').send(content);
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Socket.IO for real-time updates
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
  
  // Emit event when a new conversation is saved
  socket.on('requestConversations', async () => {
    try {
      const conversations = await system.conversationRepository.listConversations();
      socket.emit('conversationsList', conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  });
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.WEB_PORT || 8080;
server.listen(PORT, async () => {
  console.log(`Web server listening on port ${PORT}`);
  await initializeSystem();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down web server...');
  process.exit(0);
});

// Export the app for testing
module.exports = app;