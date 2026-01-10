'use client';

import { createContext, useContext } from 'react';

import type { File, Folder } from '../db/schema';

export const fileManagerContext = createContext(
  {} as {
    files: File[];
    folders: Folder[];
    currentFolder: Folder | null;
    isLoading: boolean;

    selectedFile: File | null;
    selectedFolder: Folder | null;
    selectedFiles: File[]; // Массив для хранения выбранных файлов

    refetch: () => void;
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    setFolders: React.Dispatch<React.SetStateAction<Folder[]>>;
    setSelectedFile(file: File | null): void;
    setSelectedFolder(
      folder: Folder | null,
    ): void;
    setSelectedFiles(files: File[]): void; // Функция для установки массива выбранных файлов
    addSelectedFile(file: File): void; // Функция для добавления файла в выбранные
    removeSelectedFile(fileId: number): void; // Функция для удаления файла из выбранных
    clearSelectedFiles(): void; // Функция для очистки всех выбранных файлов
  },
);

export const useFileManager = () => {
  const context = useContext(fileManagerContext);
  return context;
};
