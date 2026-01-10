'use client';

import {
  BookmarkIcon,
  CopyIcon,
  DownloadIcon,
  FilePlusIcon,
  InfoIcon,
  MoveIcon,
  TrashIcon,
} from 'lucide-react';
import { toast } from 'sonner';

import { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import { useTelegramClient } from '#/lib/client/context';
import { Button } from '#/lib/components/ui/button';
import { useFileManager } from '#/lib/file-manager';
import { trpc } from '#/lib/trpc/client';
import { useTranslation } from '#/lib/hooks/useTranslation';

// Импортируем новый компонент подтверждения удаления
import { DeleteConfirmation } from '../delete-confirmation';
import { MoveFileModal } from '../move-file-modal';
import { BatchActionsToolbar } from './batch-actions';
import Folder from './create-folder';
import RenameModal from './rename';
import UploadModal from './upload-file';

function Toolbar() {
  const params = useParams();
  const client = useTelegramClient();
  const { t } = useTranslation();
  const toggleBookmarkFile =
    trpc.toggleBookmarkFile.useMutation();
  const deleteFile =
    trpc.deleteFile.useMutation();
  const deleteFolder =
    trpc.deleteFolder.useMutation();
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

  const [isDeleting, setIsDeleting] =
    useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    selectedFile,
    selectedFolder,
    setSelectedFile,
    setSelectedFolder,
    refetch,
  } = useFileManager();

  const isSelected = Boolean(
    selectedFile || selectedFolder,
  );

  const [isBookmarked, setIsBookmarked] =
    useState(false);

  useEffect(() => {
    if (selectedFile) {
      setIsBookmarked(
        Boolean(selectedFile.isBookmarked),
      );
    } else {
      setIsBookmarked(false);
    }
  }, [selectedFile]);

  const accountId = params?.accountId as string;

  const handleFileDelete = async (fileId: number) => {
    setIsDeleting(true);
    const fileToDelete = selectedFile;
    if (!fileToDelete) return;

    try {
      // Только помечаем файл как удаленный, не удаляем из телеграма
      await deleteFile.mutateAsync(fileId);
      refetch();
      setSelectedFile(null);
      toast.success(t('File moved to trash'));
    } catch (error) {
      console.error('Error moving file to trash:', error);
      toast.error(t('Failed to move file to trash'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFolderDelete = async () => {
    if (!selectedFolder) return;
    setIsDeleting(true);

    try {
      await deleteFolder.mutateAsync({
        accountId,
        path: selectedFolder.path,
      });
      refetch();
      setSelectedFolder(null);
      toast.success(t('Folder deleted'));
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(t('Failed to delete folder'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <BatchActionsToolbar />
      <div className="flex select-none items-center border-b bg-background p-1">
        <Button
          icon={<FilePlusIcon size={18} />}
          variant="ghost"
          size="sm"
        >
          {t('Add File')}
        </Button>

        <Folder />

        <UploadModal />
        <div className="mx-2 h-6 w-0.5 border-l" />
        <Button
          icon={<BookmarkIcon size={18} />}
          variant="ghost"
          size="sm"
          disabled={!selectedFile}
          isLoading={toggleBookmarkFile.isLoading}
          onClick={() => {
            if (selectedFile) {
              toggleBookmarkFile
                .mutateAsync(selectedFile.id)
                .then((res) => {
                  refetch();
                  setIsBookmarked(!isBookmarked);
                })
                .catch(error => {
                  console.error('Error toggling bookmark:', error);
                  toast.error(t('Failed to update bookmark status'));
                });
            }
          }}
        >
          {isBookmarked ? t('Unbookmark') : t('Bookmark')}
        </Button>
        <Button
          icon={<DownloadIcon size={18} />}
          variant="ghost"
          size="sm"
          disabled={!isSelected}
        >
          {t('Download')}
        </Button>

        <Button
          icon={<CopyIcon size={18} />}
          variant="ghost"
          size="sm"
          disabled={!selectedFile}
          isLoading={copyFileMutation.isLoading}
          onClick={() => {
            if (selectedFile) {
              copyFileMutation.mutate({ fileId: selectedFile.id });
            }
          }}
        >
          {t('Copy')}
        </Button>

        <Button
          icon={<InfoIcon size={18} />}
          variant="ghost"
          size="sm"
          disabled={!isSelected}
          onClick={() => {
            if (selectedFile) {
              setSelectedFile(selectedFile);
              setSelectedFolder(null);
            } else if (selectedFolder) {
              setSelectedFile(null);
              setSelectedFolder(selectedFolder);
            }
          }}
        >
          {t('Info')}
        </Button>
        
        <Button
          icon={<MoveIcon size={18} />}
          variant="ghost"
          size="sm"
          disabled={!selectedFile}
          isLoading={moveFileMutation.isLoading}
          onClick={() => {
            if (selectedFile) {
              setIsMoveModalOpen(true);
            }
          }}
        >
          {t('Move')}
        </Button>

        <RenameModal
          isSelected={isSelected}
          type={selectedFile ? 'file' : 'folder'}
        />
        <Button
          icon={<TrashIcon size={18} />}
          variant="ghost"
          size="sm"
          disabled={!isSelected || isDeleting}
          isLoading={isDeleting}
          onClick={() => {
            if (selectedFile) {
              setShowDeleteConfirm(true);
            } else if (selectedFolder) {
              handleFolderDelete();
            }
          }}
        >
          {t('Delete')}
        </Button>
        
        {selectedFile && (
          <DeleteConfirmation
            file={selectedFile}
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleFileDelete}
            onCancel={() => {
              // При отмене просто закрываем модальное окно без дополнительных действий
              setShowDeleteConfirm(false);
            }}
          />
        )}

        {/* Модальное окно перемещения файла */}
        {selectedFile && (
          <MoveFileModal
            file={{
              id: selectedFile.id,
              filename: selectedFile.filename,
            }}
            isOpen={isMoveModalOpen}
            onClose={() => setIsMoveModalOpen(false)}
            onMove={(fileId, targetPath) => {
              moveFileMutation.mutate({ fileId, targetPath });
              setIsMoveModalOpen(false);
            }}
            accountId={selectedFile.accountId}
          />
        )}
      </div>
    </>
  );
}

export default Toolbar;
