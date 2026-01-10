'use client';

import { useState, useEffect } from 'react';

import {
  useParams,
  useSearchParams,
} from 'next/navigation';

import { trpc } from '#/lib/trpc/client';
import { useWebSocket } from '#/lib/websocket/client';
import type { File, Folder } from '../db/schema';
import { fileManagerContext } from './context';

export const FileManagerProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const params = useParams();
  const searchParams = useSearchParams();
  const path = searchParams?.get('path') ?? '/';

  const accountId = params?.accountId as string;

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);
  const [selectedFolder, setSelectedFolder] =
    useState<Folder | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    
  const [filesData, setFilesData] = useState<File[]>([]);
  const [foldersData, setFoldersData] = useState<Folder[]>([]);
  const [currentFolderData, setCurrentFolderData] = useState<Folder | null>(null);
  const [isLoadingState, setIsLoadingState] = useState(true);

  const {
    data: currentFolder,
    refetch: refetchCurrentFolder,
    isLoading: foldersLoading,
  } = trpc.getSingleFolder.useQuery(
    {
      path,
      accountId,
    },
    {
      enabled: path !== '/',
    },
  );

  const {
    data: folders,
    isLoading: foldersLoadingState,
    refetch: refetchFolders,
  } = trpc.getFolders.useQuery({
    path,
    accountId,
  });

  const {
    data: files,
    isLoading: filesLoading,
    refetch: refetchFiles,
  } = trpc.getFiles.useQuery({
    folderPath: path,
    accountId,
  });

  // Инициализируем WebSocket
  const { connectionStatus } = useWebSocket(accountId);

  // Обработчик событий файловой системы
  useEffect(() => {
    const handleFileSystemUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, payload } = customEvent.detail;

      setIsLoadingState(true);
      
      // Обновляем данные в зависимости от типа события
      switch (type) {
        case 'FILE_ADDED':
          setFilesData(prev => [...prev, payload]);
          break;
        case 'FILE_REMOVED':
          setFilesData(prev => prev.filter(file => file.id !== payload.id));
          break;
        case 'FILE_UPDATED':
          setFilesData(prev => {
            const existingIndex = prev.findIndex(file => file.id === payload.id);
            
            // Получаем текущий путь из URL, если window доступен
            let currentPath = path; // используем path из props
            if (typeof window !== 'undefined') {
              const searchParams = new URLSearchParams(window.location.search);
              currentPath = searchParams.get('path') || '/';
            }
            
            if (existingIndex >= 0) {
              // Файл уже существует в списке
              if (payload.folderPath === currentPath) {
                // Обновляем файл, если он в текущей папке
                const updated = [...prev];
                updated[existingIndex] = payload;
                return updated;
              } else {
                // Удаляем файл, если он был перемещен в другую папку
                return prev.filter((_, index) => index !== existingIndex);
              }
            } else {
              // Файл не существует в списке
              if (payload.folderPath === currentPath) {
                // Добавляем файл, если он был перемещен в текущую папку
                return [...prev, payload];
              }
              return prev;
            }
          });
          break;
        case 'FOLDER_CREATED':
          setFoldersData(prev => [...prev, payload]);
          break;
        case 'FOLDER_DELETED':
          setFoldersData(prev => prev.filter(folder => folder.id !== payload.id));
          break;
        case 'FOLDER_RENAMED':
          setFoldersData(prev => prev.map(folder => folder.id === payload.id ? payload : folder));
          break;
        default:
          // Обновляем все данные при неизвестном типе события
          refetchFiles();
          refetchFolders();
          refetchCurrentFolder();
      }

      // Устанавливаем таймер для сброса состояния загрузки
      setTimeout(() => setIsLoadingState(false), 100);
    };

    window.addEventListener('filesystem-update', handleFileSystemUpdate);

    // Инициализируем начальные данные
    setFilesData(files || []);
    setFoldersData(folders || []);
    setCurrentFolderData(currentFolder || null);
    setIsLoadingState(filesLoading || foldersLoadingState);

    return () => {
      window.removeEventListener('filesystem-update', handleFileSystemUpdate);
    };
  }, [files, folders, currentFolder, filesLoading, foldersLoadingState, refetchFiles, refetchFolders, refetchCurrentFolder]);

  // Обновляем состояние загрузки
  useEffect(() => {
    setIsLoadingState(filesLoading || foldersLoadingState);
  }, [filesLoading, foldersLoadingState]);

  return (
    <fileManagerContext.Provider
      value={{
        files: filesData,
        folders: foldersData,
        currentFolder: currentFolderData,
        isLoading: isLoadingState,
        selectedFile: selectedFile,
        selectedFolder: selectedFolder,
        selectedFiles: selectedFiles,
        setFiles: setFilesData,
        setFolders: setFoldersData,
        setSelectedFile: (file: File) => {
          setSelectedFile(file);
        },
        setSelectedFolder: (folder: Folder) => {
          setSelectedFolder(folder);
        },
        setSelectedFiles: (files: File[]) => {
          setSelectedFiles(files);
        },
        addSelectedFile: (file: File) => {
          setSelectedFiles(prev => {
            // Проверяем, не содержится ли уже файл в списке
            const exists = prev.some(f => f.id === file.id);
            if (!exists) {
              return [...prev, file];
            }
            return prev;
          });
        },
        removeSelectedFile: (fileId: number) => {
          setSelectedFiles(prev => prev.filter(f => f.id !== fileId));
        },
        clearSelectedFiles: () => {
          setSelectedFiles([]);
        },
        refetch: () => {
          refetchCurrentFolder();
          refetchFolders();
          refetchFiles();
        },
      }}
    >
      {children}
    </fileManagerContext.Provider>
  );
};
