import { useEffect, useRef, useState } from 'react';
import { WebSocketErrorHandler } from './error-handler';

type FileSystemEventType =
  | 'FILE_ADDED'
  | 'FILE_REMOVED'
  | 'FILE_UPDATED'
  | 'FOLDER_CREATED'
  | 'FOLDER_DELETED'
  | 'FOLDER_RENAMED';

interface FileSystemEvent {
  type: FileSystemEventType;
  accountId: string;
  payload: any;
  timestamp: number;
}

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
  const reconnectInterval = 3000; // 3 секунды

  // Функция подключения
  const connect = (accountId: string) => {
    // Если уже подключены, отключаемся
    if (wsRef.current) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');

    // Определяем протокол в зависимости от окружения
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Для production может потребоваться указать конкретный порт
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || window.location.port;
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || window.location.hostname;
    
    let wsUrl;
    if (process.env.NODE_ENV === 'production') {
      // В продакшене используем внешний WebSocket сервер
      wsUrl = `${protocol}//${wsHost}:${wsPort}/ws?accountId=${encodeURIComponent(accountId)}`;
    } else {
      // В разработке можем использовать тот же хост
      wsUrl = `${protocol}//${window.location.host}/api/ws?accountId=${encodeURIComponent(accountId)}`;
    }
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0; // Сбрасываем попытки переподключения при успешном подключении
      };

      wsRef.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Обработка ошибки закрытия
        WebSocketErrorHandler.handleCloseError(event, accountId);

        // Пытаемся переподключиться, если это не было вызвано пользователем
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
          
          // Обработка полученного сообщения
          handleWebSocketMessage(data);
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

  // Функция отключения
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

  // Функция отправки сообщения
  const send = (event: FileSystemEvent) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    } else {
      console.warn('WebSocket is not connected, cannot send message');
    }
  };

  // Обработчик входящих сообщений
  const handleWebSocketMessage = (data: FileSystemEvent) => {
    // Вызываем глобальное событие для обработки сообщения
    window.dispatchEvent(new CustomEvent('filesystem-update', { detail: data }));
  };

  // Автоматическое подключение при изменении accountId
  useEffect(() => {
    if (accountId) {
      connect(accountId);
    }

    return () => {
      disconnect();
    };
  }, [accountId]);

  // Очистка при размонтировании
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

// Функция для отправки события файловой системы
export function sendFileSystemEvent(event: Omit<FileSystemEvent, 'timestamp'>) {
  const fullEvent: FileSystemEvent = {
    ...event,
    timestamp: Date.now(),
  };
  
  // Отправляем событие через глобальный объект window, если доступно
  if (typeof window !== 'undefined' && (window as any).__WS_MANAGER__) {
    (window as any).__WS_MANAGER__.send(fullEvent);
  } else {
    console.warn('WebSocket manager not available, cannot send event');
  }
}