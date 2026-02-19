const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();
console.log("MONGO_URI:", process.env.MONGO_URI);
// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// ─── WebSocket Server ────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server });

// Store connected clients with their user info
const clients = new Map();

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      // Client registers with userId
      if (data.type === 'register') {
        clients.set(ws, { userId: data.userId, userName: data.userName });
        console.log(`User ${data.userName} connected via WebSocket`);
        ws.send(JSON.stringify({ type: 'registered', message: 'Connected to Nexus real-time server' }));
      }
    } catch (err) {
      console.error('WS message error:', err);
    }
  });

  ws.on('close', () => {
    const user = clients.get(ws);
    if (user) console.log(`User ${user.userName} disconnected`);
    clients.delete(ws);
  });

  ws.on('error', (err) => console.error('WS error:', err));
});

// Broadcast to all connected clients except sender
const broadcast = (data, excludeWs = null) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

// Make broadcast available to routes via app locals
app.locals.broadcast = broadcast;
app.locals.wss = wss;
app.locals.clients = clients;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/logs', require('./routes/logs'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nexus API is running',
    timestamp: new Date().toISOString(),
    wsClients: wss.clients.size,
  });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Nexus server running on http://localhost:${PORT}`);
  console.log(`⚡ WebSocket server ready`);
  console.log(`🌿 Environment: ${process.env.NODE_ENV}\n`);
});

module.exports = { app, broadcast };
