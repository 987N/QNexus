import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  containerId?: number;
  timestamp?: number;
  [key: string]: any;
}

export function useWebSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectDelay = 3000; // 3 seconds

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] 已连接');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
        } catch (err) {
          console.error('[WebSocket] 消息解析失败:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] 错误:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] 已断开');
        setIsConnected(false);
        wsRef.current = null;

        // 尝试重连
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`[WebSocket] ${reconnectDelay/1000}秒后尝试重连 (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          console.error('[WebSocket] 达到最大重连次数');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] 连接失败:', err);
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] 未连接，无法发送消息');
    }
  }, []);

  const subscribe = useCallback((containerId: number) => {
    send({ type: 'subscribe', containerId });
  }, [send]);

  return {
    isConnected,
    lastMessage,
    send,
    subscribe
  };
}
