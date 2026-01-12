import { useEffect, useRef, useState } from 'react';
import { WebSocketErrorHandler } from './error-handler';
import { FileSystemEventType, FileSystemEvent } from '../types/websocket-events';

interface WebSocketManager {
  connect: (accountId: string) => void;
  disconnect: () => void;
  send: (event: FileSystemEvent) => void;
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export function useWebSocket(accountId: string): WebSocketManager {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectInterval = 3000;

  const connect = (accountId: string) => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || window.location.port;
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname;
    
    let wsUrl;
    if (process.env.NODE_ENV === 'production') {
      wsUrl = `${protocol}//${wsHost}:${wsPort}/api/ws?accountId=${encodeURIComponent(accountId)}`;
    } else {
      wsUrl = `${protocol}//${window.location.host}/api/ws?accountId=${encodeURIComponent(accountId)}`;
    }
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        WebSocketErrorHandler.handleCloseError(event, accountId);

        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          console.log(`Attempting to reconnect (${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect(accountId);
          }, reconnectInterval);
        } else if (event.code !== 1000) {
          console.error('Max reconnection attempts reached');
          setConnectionStatus('error');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        WebSocketErrorHandler.handleConnectionError(error, accountId);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data: FileSystemEvent = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          window.dispatchEvent(new CustomEvent('filesystem-update', { detail: data }));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      WebSocketErrorHandler.handleError(error as Error, accountId);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect'); // Код 1000 означает нормальное закрытие
      wsRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
  };

  const send = (event: FileSystemEvent) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  };

  useEffect(() => {
    if (accountId) {
      connect(accountId);
    }

    return () => {
      disconnect();
    };
  }, [accountId]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    send,
    isConnected,
    connectionStatus,
  };
}

export function sendFileSystemEvent(event: Omit<FileSystemEvent, 'timestamp'>) {
  const fullEvent: FileSystemEvent = {
    ...event,
    timestamp: Date.now(),
  };
  
  if (typeof window !== 'undefined' && (window as any).__WS_MANAGER__) {
    (window as any).__WS_MANAGER__.send(fullEvent);
  } else {
    console.warn('WebSocket manager not available, cannot send event');
  }
}