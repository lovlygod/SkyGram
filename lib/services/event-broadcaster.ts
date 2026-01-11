/**
 * Сервис для отправки событий через WebSocket
 * Использует динамический импорт для избежания проблем с SSR
 */

type FileSystemEventType = 
  | 'FILE_ADDED'
  | 'FILE_REMOVED'
  | 'FILE_UPDATED'
  | 'FOLDER_CREATED'
  | 'FOLDER_DELETED'
  | 'FOLDER_RENAMED'
  | 'BATCH_FILE_DELETED'
  | 'BATCH_FILE_MOVED'
  | 'BATCH_FILE_BOOKMARKED';

interface FileSystemEvent {
 type: FileSystemEventType;
  accountId: string;
  payload: any;
  timestamp: number;
}

export async function broadcastEvent(accountId: string, event: FileSystemEvent): Promise<void> {
  if (typeof window === 'undefined') {
    try {
      const { wsManager } = await import('../websocket/server');
      if (wsManager && typeof wsManager.broadcastToAccount === 'function') {
        wsManager.broadcastToAccount(accountId, event);
      }
    } catch (e) {
      console.debug('WebSocket not available, event not sent:', event);
    }
  }
}