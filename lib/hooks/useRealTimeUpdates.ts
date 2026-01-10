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

  // Функция для дифференциального обновления файлов
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
          
          // Получаем текущий путь из URL, если window доступен
          let currentPath = '/';
          if (typeof window !== 'undefined') {
            const searchParams = new URLSearchParams(window.location.search);
            currentPath = searchParams.get('path') || '/';
          }
          
          if (existingIndex >= 0) {
            // Файл уже существует в списке
            if (payload.folderPath === currentPath) {
              // Обновляем файл, если он в текущей папке
              const updated = [...prev];
              updated[existingIndex] = payload as File;
              return updated;
            } else {
              // Удаляем файл, если он был перемещен в другую папку
              return prev.filter((_, index) => index !== existingIndex);
            }
          } else {
            // Файл не существует в списке
            if (payload.folderPath === currentPath) {
              // Добавляем файл, если он был перемещен в текущую папку
              return [...prev, payload as File];
            }
            return prev;
          }
        });
        break;
      case 'BATCH_FILE_DELETED':
        // Удаляем несколько файлов по ID
        if (Array.isArray(payload.fileIds)) {
          setFiles(prev => prev.filter((file: File) => !payload.fileIds.includes(file.id)));
        }
        break;
      case 'BATCH_FILE_MOVED':
        // Обновляем путь для нескольких файлов
        if (Array.isArray(payload.files)) {
          setFiles(prev => {
            const updatedFiles = [...prev];
            payload.files.forEach((updatedFile: File) => {
              const index = updatedFiles.findIndex((file: File) => file.id === updatedFile.id);
              if (index !== -1) {
                updatedFiles[index] = updatedFile;
              } else {
                // Если файл не найден в текущем списке, возможно он был перемещен в другую папку
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
        // Обновляем статус закладки для нескольких файлов
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
        // Для других событий просто обновляем всё
        refetch();
        break;
    }
  }, [setFiles, refetch]);

  // Функция для дифференциального обновления папок
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
        // Для других событий просто обновляем всё
        refetch();
        break;
    }
  }, [setFolders, refetch]);

  useEffect(() => {
    // Создаем обработчик событий
    eventHandlerRef.current = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, payload } = customEvent.detail as FileSystemEvent;

      console.log('Получено WebSocket событие:', type, payload);

      // В зависимости от типа события вызываем соответствующую функцию обновления
      if (type.startsWith('FILE_') || type.startsWith('BATCH_')) {
        updateFiles(type, payload);
      } else if (type.startsWith('FOLDER_')) {
        updateFolders(type, payload);
      } else {
        // Для других событий просто обновляем всё
        refetch();
      }
    };

    // Подписываемся на события
    window.addEventListener('filesystem-update', eventHandlerRef.current);

    return () => {
      // Отписываемся от событий
      if (eventHandlerRef.current) {
        window.removeEventListener('filesystem-update', eventHandlerRef.current);
      }
    };
  }, [updateFiles, updateFolders, refetch]);

  return null;
};