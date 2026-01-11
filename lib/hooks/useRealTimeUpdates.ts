import { useEffect, useRef, useCallback } from 'react';
import { useFileManager } from '../file-manager/context';
import type { File, Folder } from '../db/schema';

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

export const useRealTimeUpdates = () => {
  const {
    setFiles,
    setFolders,
    refetch
  } = useFileManager();
  
  const eventHandlerRef = useRef<(event: Event) => void>();

  const updateFiles = useCallback((type: FileSystemEventType, payload: any) => {
    switch (type) {
      case 'FILE_ADDED':
        setFiles(prev => [...prev, payload as File]);
        break;
      case 'FILE_REMOVED':
        setFiles(prev => prev.filter((file: File) => file.id !== payload.id));
        break;
      case 'FILE_UPDATED':
        setFiles(prev => {
          const existingIndex = prev.findIndex((file: File) => file.id === payload.id);
          
          let currentPath = '/';
          if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            currentPath = searchParams.get('path') || '/';
          }
          
          if (existingIndex >= 0) {
            if (payload.folderPath === currentPath) {
              const updated = [...prev];
              updated[existingIndex] = payload as File;
              return updated;
            } else {
              return prev.filter((_, index) => index !== existingIndex);
            }
          } else {
            // Файл не существует в списке
            if (payload.folderPath === currentPath) {
              return [...prev, payload as File];
            }
            return prev;
          }
        });
        break;
      case 'BATCH_FILE_DELETED':
        if (Array.isArray(payload.fileIds)) {
          setFiles(prev => prev.filter((file: File) => !payload.fileIds.includes(file.id)));
        }
        break;
      case 'BATCH_FILE_MOVED':
        if (Array.isArray(payload.files)) {
          setFiles(prev => {
            const updatedFiles = [...prev];
            payload.files.forEach((updatedFile: File) => {
              const index = updatedFiles.findIndex((file: File) => file.id === updatedFile.id);
              if (index !== -1) {
                updatedFiles[index] = updatedFile;
              } else {
                const currentPath = typeof window !== 'undefined'
                  ? new URLSearchParams(window.location.search).get('path') || '/' 
                  : '/';
                
                if (updatedFile.folderPath === currentPath) {
                  updatedFiles.push(updatedFile);
                }
              }
            });
            return updatedFiles;
          });
        }
        break;
      case 'BATCH_FILE_BOOKMARKED':
        if (Array.isArray(payload.files)) {
          setFiles(prev => {
            const updatedFiles = [...prev];
            payload.files.forEach((updatedFile: File) => {
              const index = updatedFiles.findIndex((file: File) => file.id === updatedFile.id);
              if (index !== -1) {
                updatedFiles[index] = updatedFile;
              }
            });
            return updatedFiles;
          });
        }
        break;
      default:
        refetch();
        break;
    }
  }, [setFiles, refetch]);

  const updateFolders = useCallback((type: FileSystemEventType, payload: any) => {
    switch (type) {
      case 'FOLDER_CREATED':
        setFolders(prev => [...prev, payload as Folder]);
        break;
      case 'FOLDER_DELETED':
        setFolders(prev => prev.filter((folder: Folder) => folder.id !== payload.id));
        break;
      case 'FOLDER_RENAMED':
        setFolders(prev => prev.map((folder: Folder) => folder.id === payload.id ? payload as Folder : folder));
        break;
      default:
        refetch();
        break;
    }
  }, [setFolders, refetch]);

  useEffect(() => {
    eventHandlerRef.current = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, payload } = customEvent.detail as FileSystemEvent;

      console.log('Получено WebSocket событие:', type, payload);

      if (type.startsWith('FILE_') || type.startsWith('BATCH_')) {
        updateFiles(type, payload);
      } else if (type.startsWith('FOLDER_')) {
        updateFolders(type, payload);
      } else {
        refetch();
      }
    };

    window.addEventListener('filesystem-update', eventHandlerRef.current);

    return () => {
      if (eventHandlerRef.current) {
        window.removeEventListener('filesystem-update', eventHandlerRef.current);
      }
    };
  }, [updateFiles, updateFolders, refetch]);

  return null;
};