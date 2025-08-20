import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import dotenv from 'dotenv';
import socketHandler from './socket';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10); 
const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: [
    'http://localhost:3000',
    process.env.FRONTEND_URL || '',
    // VERCEL URL TO ADD
  ].filter(Boolean),
  credentials: true
}));

console.log('[ws-server] Starting WebSocket server...');

const io = new Server(httpServer, {
  cors: {
    origin: [
      'http://localhost:3000',
      process.env.FRONTEND_URL || '',
    // VERCEL URL TO ADD
    ].filter(Boolean),
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.get('/', (req, res) => {
  res.send('WebSocket server is running!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

async function main() {
  try {
    const pubClient = createClient({ 
      url: process.env.REDIS_URL || 'redis://localhost:6379' 
    });
    const subClient = pubClient.duplicate();

    await pubClient.connect();
    await subClient.connect();

    console.log('✅ Redis connected successfully');

    io.adapter(createAdapter(pubClient, subClient));
    socketHandler(io);

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ WebSocket server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});