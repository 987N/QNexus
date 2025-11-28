require('dotenv').config();
const fastify = require('fastify')({ logger: true });
const path = require('path');

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: true // Allow all origins for development
});

// Register Multipart
fastify.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  }
});

// Basic Health Check Route
fastify.get('/api/status', async (request, reply) => {
  return { status: 'ok', message: 'QB Manager Backend is running' };
});

// Register Routes
fastify.register(require('./src/routes/qb'));
fastify.register(require('./src/routes/torrents'));

// Start Sync Service
const syncService = require('./src/services/syncService');
syncService.start();

// Start WebSocket Service
const websocketService = require('./src/services/websocket');

// Run the server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    
    // 启动 WebSocket 服务（使用 Fastify 的 HTTP 服务器）
    websocketService.start(fastify.server);
    
    // 连接 WebSocket 到同步服务
    syncService.setWebSocketService(websocketService);
    
    console.log(`Server running at http://localhost:${port}`);
    console.log(`WebSocket server running on ws://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
