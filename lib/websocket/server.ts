import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { FileSystemEventType, FileSystemEvent } from '../types/websocket-events';

interface WebSocketWithAccount extends WebSocket {
  accountId?: string;
}

class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<WebSocketWithAccount>> = new Map();

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public init(server: http.Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/api/ws',
    });

    this.wss.on('connection', (ws: WebSocketWithAccount, req: http.IncomingMessage) => {
      console.log('New WebSocket connection');

      const url = new URL(`http://localhost${req.url || ''}`);
      const accountId = url.searchParams.get('accountId');
      
      if (accountId) {
        ws.accountId = accountId;
        
        if (!this.clients.has(accountId)) {
          this.clients.set(accountId, new Set());
        }
        this.clients.get(accountId)?.add(ws);

        console.log(`Client connected for account: ${accountId}, total connections: ${this.clients.get(accountId)?.size}`);
      } else {
        console.warn('Connection without account ID');
        ws.close();
        return;
      }

      ws.on('close', () => {
        console.log(`Client disconnected for account: ${ws.accountId}`);
        if (ws.accountId) {
          this.removeClient(ws, ws.accountId);
        }
      });

      ws.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        if (ws.accountId) {
          this.removeClient(ws, ws.accountId);
        }
      });
    });

    this.wss.on('error', (error: Error) => {
      console.error('WebSocket server error:', error);
    });
  }

  private removeClient(client: WebSocketWithAccount, accountId: string): void {
    const accountClients = this.clients.get(accountId);
    if (accountClients) {
      accountClients.delete(client);
      if (accountClients.size === 0) {
        this.clients.delete(accountId);
      }
    }
  }

  public broadcastToAccount(accountId: string, event: FileSystemEvent): void {
    const clients = this.clients.get(accountId);
    if (!clients) {
      console.log(`No clients found for account: ${accountId}`);
      return;
    }

    console.log(`Broadcasting to ${clients.size} clients for account: ${accountId}`);
    
    const message = JSON.stringify(event);
    const clientsArray = Array.from(clients);
    const clientsToRemove = [];
    
    for (const client of clientsArray) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Error sending message to client:', error);
          clientsToRemove.push(client);
        }
      } else {
        clientsToRemove.push(client);
      }
    }
    
    for (const client of clientsToRemove) {
      this.removeClient(client, accountId);
    }
  }

  public broadcastToAll(event: FileSystemEvent): void {
    this.clients.forEach((clients, accountId) => {
      this.broadcastToAccount(accountId, event);
    });
  }

  public getClientsCount(accountId: string): number {
    return this.clients.get(accountId)?.size || 0;
  }

  public close(): void {
    if (this.wss) {
      this.wss.close(() => {
        console.log('WebSocket server closed');
      });
    }
  }
  
  public isAccountConnected(accountId: string): boolean {
    return this.clients.has(accountId) && this.clients.get(accountId)!.size > 0;
  }
  
  public getAccountConnections(accountId: string): number {
    return this.clients.get(accountId)?.size || 0;
  }
}

export const wsManager = WebSocketManager.getInstance();

export function handleWebSocket(req: http.IncomingMessage, socket: any, head: Buffer) {
  if (!wsManager['wss']) {
    console.error('WebSocket server not initialized');
    socket.destroy();
    return;
  }

  wsManager['wss']?.handleUpgrade(req, socket, head, (ws: WebSocket) => {
    wsManager['wss']?.emit('connection', ws, req);
  });
}