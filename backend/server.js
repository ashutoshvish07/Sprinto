const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const helmet = require('helmet');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler')

const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app);

// ─── WebSocket Server ────────────────────────────────────────────────────────
const wss = new WebSocket.Server({ server });
const clients = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'register') {
        clients.set(ws, { userId: data.userId, userName: data.userName });
        console.log(`User ${data.userName} connected via WebSocket`);
        ws.send(JSON.stringify({ type: 'registered', message: 'Connected to Sprinto real-time server' }));
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

const broadcast = (data, excludeWs = null) => {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

app.locals.broadcast = broadcast;
app.locals.wss = wss;
app.locals.clients = clients;

// ─── Feature 5: Helmet Security Headers ──────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", 'ws://localhost:5000', 'wss://localhost:5000'],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
    },
  },
}));

// ─── Feature 4: General Rate Limiting ────────────────────────────────────────
app.use('/api/', generalLimiter);

// ─── Standard Middleware ──────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/comments', require('./routes/comments'));
app.use(errorHandler)

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Sprinto API running',
    timestamp: new Date().toISOString(),
    wsClients: wss.clients.size,
  });
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Sprinto server running on http://localhost:${PORT}`);
  console.log(`⚡ WebSocket server ready`);
  console.log(`🛡️  Helmet security headers active`);
  console.log(`🚦 Rate limiting active`);
  console.log(`🌿 Environment: ${process.env.NODE_ENV}\n`);
});

module.exports = { app, broadcast };
