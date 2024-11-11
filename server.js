const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const handleGPTMessage = require('./gptWorker2');
const handleHuggingFaceMessage = require('./huggingFaceWorker');
const handleClaudeMessage = require('./claudeWorker');
const handleRasaMessage = require('./rasaWorker');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const service = process.env.SERVICE;

// Load properties from JSON file
const properties = JSON.parse(fs.readFileSync(path.join(__dirname, 'properties.json'), 'utf8'));

// Add health check endpoints
app.get('/', (req, res) => {
  res.send('Chatbot Backend Server is Running!');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    service: process.env.SERVICE,
    socketConnections: io.engine.clientsCount
  });
});

io.on('connection', (socket) => {
  console.log(`New client connected. Total connections: ${io.engine.clientsCount}`);
  console.log('Client ID:', socket.id);

  // Initialize conversation history for this connection
  let conversationHistory = [];

  socket.on('disconnect', () => {
    console.log(`Client disconnected. Remaining connections: ${io.engine.clientsCount}`);
    console.log('Disconnected ID:', socket.id);
  });

  socket.on('message', async (msg) => {
    console.log(`Message received from ${socket.id}:`, msg);

    try {
      let responseText = '';

      // Add user message to conversation history
      conversationHistory.push({ role: 'user', content: msg });

      if (service === 'rasa') {
        responseText = await handleRasaMessage(msg, process.env.RASA_URL);
      } else if (service === 'chatgpt') {
        responseText = await handleGPTMessage(msg, process.env.OPENAI_API_KEY, conversationHistory);
      } else if (service === 'huggingface') {
        responseText = await handleHuggingFaceMessage(msg, process.env.HUGGINGFACE_API_KEY, conversationHistory);
      } else if (service === 'claude') {
        responseText = await handleClaudeMessage(msg, process.env.CLAUDE_API_KEY);
      }

      // Add assistant response to conversation history
      if (responseText) {
        conversationHistory.push({ role: 'assistant', content: responseText });
      }

      console.log('Response text:', responseText);
      socket.emit('response', { text: responseText });
    } catch (err) {
      console.error('Error processing message:', err);
      socket.emit('response', { text: `Error processing your message: ${err.message}` });
    }
  });

  socket.on('propertyChoice', async (property) => {
    console.log('User is interested in:', property);

    // Handle the property choice, e.g., log it, update the conversation, etc.
    const responseText = `Great choice! The ${property.type} at ${property.location} is a wonderful option. Would you like more details or similar properties?`;
    conversationHistory.push({ role: 'assistant', content: responseText });
    socket.emit('response', { text: responseText });
  });
});

app.get('/debug', (req, res) => {
  res.json({
    environment: process.env.NODE_ENV,
    service: process.env.SERVICE,
    activeConnections: io.engine.clientsCount,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});