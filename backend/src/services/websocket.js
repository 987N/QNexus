const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  start(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, request) => {
      console.log('[WebSocket] 客户端已连接');
      this.clients.add(ws);

      // 发送欢迎消息
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'WebSocket 连接成功'
      }));

      // 心跳检测
      ws.isAlive = true;
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // 处理客户端消息
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (err) {
          console.error('[WebSocket] 消息解析失败:', err);
        }
      });

      // 处理断开连接
      ws.on('close', () => {
        console.log('[WebSocket] 客户端已断开');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('[WebSocket] 错误:', error);
        this.clients.delete(ws);
      });
    });

    // 心跳检测定时器
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 每 30 秒检测一次

    console.log('[WebSocket] 服务已启动');
  }

  handleMessage(ws, data) {
    // 处理客户端发送的消息
    switch (data.type) {
      case 'subscribe':
        // 客户端订阅特定容器的更新
        ws.subscribedContainerId = data.containerId;
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        console.log('[WebSocket] 未知消息类型:', data.type);
    }
  }

  // 广播消息到所有客户端
  broadcast(message) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  // 向订阅特定容器的客户端发送消息
  broadcastToContainer(containerId, message) {
    const data = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && 
          (!client.subscribedContainerId || client.subscribedContainerId === containerId)) {
        client.send(data);
      }
    });
  }

  stop() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.wss) {
      this.wss.close();
    }
  }
}

module.exports = new WebSocketService();
