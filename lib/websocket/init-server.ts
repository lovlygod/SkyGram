import { wsManager } from './server';
import http from 'http';
import { createServer } from 'http';

let server: http.Server | null = null;

// Инициализация WebSocket сервера
export function initWebSocket(serverInstance: http.Server) {
  wsManager.init(serverInstance);
  console.log('WebSocket server initialized');
}

// Функция для получения экземпляра сервера
export function getServer() {
  return server;
}

// Функция для закрытия WebSocket сервера
export function closeWebSocket() {
  wsManager.close();
}