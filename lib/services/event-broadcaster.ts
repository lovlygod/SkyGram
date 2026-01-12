import { FileSystemEventType, FileSystemEvent } from '../types/websocket-events';

export async function broadcastEvent(accountId: string, event: Omit<FileSystemEvent, 'timestamp'>): Promise<void> {
  if (typeof window === 'undefined') {
    try {
      const { wsManager } = await import('../websocket/server');
      if (wsManager && typeof wsManager.broadcastToAccount === 'function') {
        wsManager.broadcastToAccount(accountId, {
          ...event,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.error('WebSocket not available on server, event not sent:', event);
    }
  } else {
    try {
      window.dispatchEvent(new CustomEvent('filesystem-event', { detail: { accountId, event: { ...event, timestamp: Date.now() } } }));
    } catch (e) {
      console.error('Failed to dispatch filesystem event on client:', e);
    }
  }
}

export function subscribeToFileSystemEvents(callback: (event: FileSystemEvent) => void) {
  const handler = (e: Event) => {
    if (e instanceof CustomEvent && e.detail && e.detail.event) {
      callback(e.detail.event);
    }
  };

  window.addEventListener('filesystem-event', handler);
  
  return () => {
    window.removeEventListener('filesystem-event', handler);
  };
}