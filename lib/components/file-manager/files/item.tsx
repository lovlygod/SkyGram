'use client';

import {
  BookmarkIcon,
  CodeSquareIcon,
  CopyIcon,
  DownloadIcon,
  Edit2Icon,
  ExternalLinkIcon,
  FileIcon,
  ImageIcon,
  InfoIcon,
 TextIcon,
  TrashIcon,
  VideoIcon,
  EyeIcon, // Иконка для предварительного просмотра
  MoveIcon, // Иконка для перемещения
  CheckIcon, // Иконка для индикатора выбора
} from 'lucide-react';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '#/lib/components/ui/context-menu';
import type { File } from '#/lib/db/schema';

// Импортируем компонент предварительного просмотра
import { FilePreview } from '../file-preview';
import { MoveFileModal } from '../move-file-modal';
import { DeleteConfirmation } from '../delete-confirmation';
import { trpc } from '#/lib/trpc/client';
import { useFileManager } from '#/lib/file-manager';
import { useTelegramClient } from '#/lib/client/context';
import { useTranslation } from '#/lib/hooks/useTranslation';

const icons: Record<string, React.ElementType> = {
  default: FileIcon,
  image: ImageIcon,
  video: VideoIcon,
  pdf: TextIcon,
  text: TextIcon,
  application: CodeSquareIcon,
};

function FileItem({
  file,
  onSelect,
  isSelected,
}: {
  file: File;
  isSelected?: boolean;
  onSelect?(e: React.MouseEvent<HTMLDivElement>): void;
}) {
  const [isRightClicked, setIsRightClicked] =
    useState(false);
 const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const { t } = useTranslation();
  
  const { refetch } = useFileManager();
  const moveFileMutation = trpc.moveFile.useMutation({
    onSuccess: () => {
      refetch(); // Обновляем список файлов после успешного перемещения
      toast.success(t('File moved successfully'));
    },
    onError: (error) => {
      console.error('Error moving file:', error);
      toast.error(t('Failed to move file'));
    }
  });
  
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const client = useTelegramClient();
  const renameFile = trpc.renameFile.useMutation();
  const toggleBookmarkFile = trpc.toggleBookmarkFile.useMutation();
  const deleteFile = trpc.deleteFile.useMutation();
  const createFile = trpc.createFile.useMutation();

  const handleDownload = async () => {
    try {
      const result = await client.getMessages(
        'me',
        {
          ids: parseInt(file.messageId),
        },
      );
      
      if (result.length > 0) {
        const message = result[0];
        if (message === undefined) {
          throw new Error('Message not found');
        }

        // Скачивание файла с отслеживанием прогресса
        const buffer = await client.downloadMedia(message);

        if (buffer) {
          const blob = new Blob([buffer], {
            type: file.filetype,
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.setAttribute('href', url);
          a.setAttribute('download', file.filename);

          a.click();
          URL.revokeObjectURL(url);
        } else {
          throw new Error('Failed to download file');
        }
      } else {
        throw new Error('Message not found');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('Failed to download file'));
    }
  };

   const copyFileMutation = trpc.copyFile.useMutation({
     onSuccess: () => {
       refetch(); // Обновляем список файлов после успешного копирования
       toast.success(t('File copied successfully'));
     },
     onError: (error) => {
       console.error('Error copying file:', error);
       toast.error(t('Failed to copy file'));
     }
   });

   const handleCopyFile = () => {
     copyFileMutation.mutate({ fileId: file.id });
   };

  const Icon = useMemo(() => {
    const iconKeys = Object.keys(icons);
    const type = iconKeys.find((key) =>
      file.filetype.match(key),
    );
    return icons[type ?? 'default'];
  }, [file]);

  // Обработчик переключения избранного
  const handleToggleBookmark = async () => {
    try {
      await toggleBookmarkFile.mutateAsync(file.id);
      // Обновляем список файлов, чтобы отразить изменения
      refetch();
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error(t('Failed to update bookmark status'));
    }
  };

  return (
    <>
      <ContextMenu
        onOpenChange={(isOpen) => {
          if (isOpen) {
            setIsRightClicked(true);
          } else {
            setIsRightClicked(false);
          }
        }}
      >
        <ContextMenuTrigger>
          <div
            className={`relative flex h-28 select-none flex-col items-center justify-center gap-3 rounded-lg px-2
              ${
                isSelected
                  ? 'bg-accent'
                  : isRightClicked
                    ? 'bg-accent'
                    : 'bg-transparent hover:bg-accent'
              }`}
            onClick={(ev) => {
              ev.stopPropagation();
              onSelect?.(ev);
            }}
            onDoubleClick={() => setIsPreviewOpen(true)} // Открытие предварительного просмотра по двойному клику
          >
            {/* Индикатор выбора */}
            {isSelected && (
              <div className="absolute top-1 right-1 bg-primary rounded-full p-1 flex items-center justify-center z-10">
                <CheckIcon className="text-white dark:text-primary-foreground w-3 h-3" />
              </div>
            )}
            
            <Icon size={32} />

            <h1 className="line-clamp-2 text-center">
              {file.filename}
            </h1>

            {/* Иконка избранного всегда отображается, но с разными классами для активного/неактивного состояния */}
            <BookmarkIcon
              className={`${file.isBookmarked ? 'fill-primary text-primary' : 'text-gray-400'} absolute right-2 top-2 cursor-pointer hover:opacity-80`}
              size={15}
              onClick={(e) => {
                e.stopPropagation(); // Предотвращаем всплытие события
                handleToggleBookmark();
              }}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          <ContextMenuItem className="gap-2" onClick={() => setIsPreviewOpen(true)}>
            <EyeIcon size={16} />
            {t('Preview')}
          </ContextMenuItem>
          <ContextMenuItem className="gap-2" onClick={handleToggleBookmark}>
            {file.isBookmarked ? (
              <>
                <BookmarkIcon size={16} className="fill-current" />
                {t('Remove from Bookmarks')}
              </>
            ) : (
              <>
                <BookmarkIcon size={16} />
                {t('Add to Bookmarks')}
              </>
            )}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Компонент предварительного просмотра */}
      <FilePreview
        file={{
          filename: file.filename,
          filetype: file.filetype,
          size: file.size,
          chatId: file.chatId,
          messageId: file.messageId,
        }}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
      
      {/* Модальное окно перемещения файла */}
      <MoveFileModal
        file={{
          id: file.id,
          filename: file.filename,
        }}
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        onMove={(fileId, targetPath) => {
          moveFileMutation.mutate({ fileId, targetPath });
          setIsMoveModalOpen(false);
        }}
        accountId={file.accountId}
      />
      
      {/* Модальное окно подтверждения удаления */}
      <DeleteConfirmation
        file={{
          id: file.id,
          filename: file.filename,
        }}
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={async (fileId: number) => {
          try {
            await deleteFile.mutateAsync(fileId);
            // Файл должен быть удален из локального состояния через WebSocket событие
            // Но также обновляем через refetch для гарантии синхронизации
            refetch();
            toast.success(t('File moved to trash'));
          } catch (error: any) {
            console.error('Error deleting file:', error);
            toast.error(t('Failed to move file to trash'));
          } finally {
            setIsDeleteConfirmOpen(false);
          }
        }}
        onCancel={() => {
          // При отмене просто закрываем модальное окно без дополнительных действий
          setIsDeleteConfirmOpen(false);
        }}
      />
    </>
  );
}

export default FileItem;
