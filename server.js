const path = require('path'); // Import path module first
require('dotenv').config({ path: path.resolve(__dirname, '.env') }); // Load .env file from the backend directory
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const { sequelize, Message } = require('./models');
const handleGPTMessage = require('./gptWorker2'); // Correctly import the function
const handleClaudeMessage = require('./claudeWorker');
const handleRasaMessage = require('./rasaWorker');
const handleHuggingFaceMessage = require('./huggingFaceWorker');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
}));

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://your-frontend-domain.vercel.app'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const service = process.env.SERVICE;

// Load properties from JSON file
const properties = JSON.parse(fs.readFileSync(path.join(__dirname, 'properties.json'), 'utf8'));

// Add these routes before your socket.io setup
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
    console.log('Received message from client:', msg);

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

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Add this just before your server.listen
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

// Example function to get properties
function getProperties() {
  return properties;
}