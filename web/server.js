const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs-extra');
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
const charactersDir = path.join(__dirname, '../config/characters');

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

// Characters CRUD
app.get('/api/characters', async (req, res) => {
  try {
    const files = await fs.readdir(charactersDir);
    const characters = [];
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const id = path.basename(file, '.json');
      const data = JSON.parse(await fs.readFile(path.join(charactersDir, file), 'utf8'));
      characters.push({ id, ...data });
    }
    res.json(characters);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.get('/api/characters/:id', async (req, res) => {
  try {
    const filePath = path.join(charactersDir, `${req.params.id}.json`);
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    res.json({ id: req.params.id, ...data });
  } catch (error) {
    res.status(404).json({ status: 'error', message: error.message });
  }
});

app.post('/api/characters', async (req, res) => {
  try {
    const { id, ...character } = req.body;
    if (!id) return res.status(400).json({ status: 'error', message: 'Character ID is required' });
    const filePath = path.join(charactersDir, `${id}.json`);
    await fs.writeFile(filePath, JSON.stringify(character, null, 2), 'utf8');
    res.json({ status: 'success', message: 'Character created' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.put('/api/characters/:id', async (req, res) => {
  try {
    const { id: _id, ...character } = req.body;
    const filePath = path.join(charactersDir, `${req.params.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(character, null, 2), 'utf8');
    res.json({ status: 'success', message: 'Character updated' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.delete('/api/characters/:id', async (req, res) => {
  try {
    const filePath = path.join(charactersDir, `${req.params.id}.json`);
    await fs.remove(filePath);
    res.json({ status: 'success', message: 'Character deleted' });
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
initializeSystem().then(() => {
  server.listen(PORT, () => {
    console.log(`Web server listening on port ${PORT}`);
  });
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down web server...');
  process.exit(0);
});

// Export the app for testing
module.exports = app;