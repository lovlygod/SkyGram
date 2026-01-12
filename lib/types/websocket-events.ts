export type FileSystemEventType =
  | 'FILE_ADDED'
  | 'FILE_REMOVED'
  | 'FILE_UPDATED'
  | 'FOLDER_CREATED'
  | 'FOLDER_DELETED'
  | 'FOLDER_RENAMED'
  | 'BATCH_FILE_DELETED'
  | 'BATCH_FILE_MOVED'
  | 'BATCH_FILE_BOOKMARKED';

export interface FileSystemEvent {
  type: FileSystemEventType;
  accountId: string;
  payload: any;
  timestamp: number;
}