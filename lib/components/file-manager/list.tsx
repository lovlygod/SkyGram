'use client';

import { AnimatePresence } from 'framer-motion';

import React, { memo } from 'react';

import { useRouter } from 'next/navigation';

import { useFileManager } from '#/lib/file-manager';
import { useRealTimeUpdates } from '#/lib/hooks/useRealTimeUpdates';
import { useTranslation } from '#/lib/hooks/useTranslation';
import type { File } from '#/lib/db/schema';

import ItemLoader from '../common/item-loader';
import FileInfo from './files/info';
import FileItem from './files/item';
import FolderInfo from './folders/info';
import FolderItem from './folders/item';

function formatDate<T>(
  data: Record<string, any>,
): T {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  } as T;
}

function ListItems() {
  const r = useRouter();
  const { t } = useTranslation();

  const {
    files,
    folders,
    isLoading,
    selectedFile,
    setSelectedFile,
    selectedFolder,
    setSelectedFolder,
    selectedFiles,
    addSelectedFile,
    removeSelectedFile,
    clearSelectedFiles,
  } = useFileManager();

  useRealTimeUpdates();

  const noItems =
    !folders?.length && !files?.length;

  const handleFileSelect = (file: File, e: React.MouseEvent<HTMLDivElement>) => {
    const isMultiSelect = e.ctrlKey || e.metaKey;
    
    if (isMultiSelect) {
      const isSelected = selectedFiles.some(f => f.id === file.id);
      if (isSelected) {
        removeSelectedFile(file.id);
      } else {
        addSelectedFile(file);
      }
    } else {
      setSelectedFile(file);
      setSelectedFolder(null);
      clearSelectedFiles();
    }
  };

  return (
    <AnimatePresence>
      <div className="flex flex-1 items-start overflow-hidden">
        {isLoading ? (
          <div className="grid h-full flex-1 grid-cols-3 content-start gap-4 overflow-hidden p-4 2xl:grid-cols-5">
            <ItemLoader count={20} />
          </div>
        ) : noItems ? (
          <div className="flex h-full flex-1 items-center justify-center">
            <span>{t('No items found')}</span>
          </div>
        ) : (
          <div
            className="grid h-full flex-1 grid-cols-2 content-start justify-evenly gap-1 overflow-auto p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
            onClick={() => {
              setSelectedFile(null);
              setSelectedFolder(null);
              clearSelectedFiles();
            }}
          >
            {folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={formatDate(folder)}
                isSelected={
                  folder.id === selectedFolder?.id
                }
                onSelect={() => {
                  setSelectedFolder(folder);
                  setSelectedFile(null);
                  clearSelectedFiles();
                }}
                onDoubleClick={() => {
                  const url = new URL(
                    window.location.href,
                  );
                  url.searchParams.set(
                    'path',
                    folder.path ?? '/',
                  );
                  r.push(url.toString());
                }}
              />
            ))}

            {files.map((file) => (
              <FileItem
                file={file}
                key={file.id}
                isSelected={
                  file.id === selectedFile?.id || selectedFiles.some(f => f.id === file.id)
                }
                onSelect={(e) => handleFileSelect(file, e)}
              />
            ))}
          </div>
        )}

        <div className="bg-background h-full w-[25%] border-l">
          {selectedFile ? (
            <FileInfo
              file={selectedFile}
              onClose={() =>
                setSelectedFile(null)
              }
            />
          ) : selectedFolder ? (
            <FolderInfo
              folder={selectedFolder}
              onClose={() =>
                setSelectedFolder(null)
              }
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span>{t('No file selected')}</span>
            </div>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
}

export default memo(ListItems);
