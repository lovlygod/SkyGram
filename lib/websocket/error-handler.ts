import { toast } from 'sonner';

// Обработчик ошибок WebSocket
export class WebSocketErrorHandler {
  // Обработка ошибок подключения
  static handleConnectionError(error: Event, accountId: string) {
    console.error(`WebSocket connection error for account ${accountId}:`, error);
    toast.error('Connection error: Could not establish real-time sync');
 }

  // Обработка ошибок во время передачи данных
  static handleTransferError(error: Event, accountId: string) {
    console.error(`WebSocket transfer error for account ${accountId}:`, error);
    // Не показываем уведомление при каждой ошибке передачи, чтобы не засорять UI
 }

  // Обработка ошибок закрытия соединения
  static handleCloseError(closeEvent: CloseEvent, accountId: string) {
    console.warn(`WebSocket closed for account ${accountId} with code:`, closeEvent.code, closeEvent.reason);
    
    // Коды ошибок WebSocket
    if (closeEvent.code !== 1000) { // 1000 - нормальное закрытие
      switch (closeEvent.code) {
        case 1006: // Аварийное закрытие
          console.error(`WebSocket abnormally closed for account ${accountId}`);
          break;
        default:
          console.error(`WebSocket closed unexpectedly for account ${accountId} with code ${closeEvent.code}`);
      }
    }
  }

  // Обработка общих ошибок
  static handleError(error: Error, accountId: string) {
    console.error(`General WebSocket error for account ${accountId}:`, error);
  }
}