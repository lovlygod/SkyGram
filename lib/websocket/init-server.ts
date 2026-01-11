import { wsManager } from './server';
import http from 'http';
import { createServer } from 'http';

let server: http.Server | null = null;

export function initWebSocket(serverInstance: http.Server) {
  wsManager.init(serverInstance);
  console.log('WebSocket server initialized');
}

export function getServer() {
  return server;
}

export function closeWebSocket() {
  wsManager.close();
}