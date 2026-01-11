import { toast } from 'sonner';

export class WebSocketErrorHandler {
  static handleConnectionError(error: Event, accountId: string) {
    console.error(`WebSocket connection error for account ${accountId}:`, error);
    toast.error('Connection error: Could not establish real-time sync');
 }

  static handleTransferError(error: Event, accountId: string) {
    console.error(`WebSocket transfer error for account ${accountId}:`, error);
 }

  static handleCloseError(closeEvent: CloseEvent, accountId: string) {
    console.warn(`WebSocket closed for account ${accountId} with code:`, closeEvent.code, closeEvent.reason);
    
    if (closeEvent.code !== 1000) {
      switch (closeEvent.code) {
        case 1006:
          console.error(`WebSocket abnormally closed for account ${accountId}`);
          break;
        default:
          console.error(`WebSocket closed unexpectedly for account ${accountId} with code ${closeEvent.code}`);
      }
    }
  }

  static handleError(error: Error, accountId: string) {
    console.error(`General WebSocket error for account ${accountId}:`, error);
  }
}