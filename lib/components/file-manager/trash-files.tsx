'use client';

import { RotateCcwIcon, TrashIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { useTelegramClient } from '#/lib/client/context';
import { Button } from '../ui/button';
import { trpc } from '#/lib/trpc/client';
import { useTranslation } from '#/lib/hooks/useTranslation';

interface TrashFile {
  id: number;
  filename: string;
  filetype: string;
  size: number;
  chatId: string;
  messageId: string;
  createdAt: Date;
  deletedAt: string | null; // deletedAt может быть null
}

interface TrashFilesProps {
  accountId: string;
  onRestore?: () => void;
}

export function TrashFiles({ accountId, onRestore }: TrashFilesProps) {
  const client = useTelegramClient();
  const [isRestoring, setIsRestoring] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const { t } = useTranslation();

  const { data: files, isLoading, refetch } = trpc.getTrashFiles.useQuery(
    { accountId },
    { refetchOnWindowFocus: false }
  );

  const restoreFile = trpc.restoreFileFromTrash.useMutation();
  const deleteFilePermanently = trpc.deleteFilePermanently.useMutation();

  const handleRestore = async (fileId: number, chatId: string, messageId: string) => {
    setIsRestoring(fileId);
    
    try {
      // Восстановление файла
      await restoreFile.mutateAsync({ fileId });
      toast.success(t('File restored successfully'));
      refetch();
      if (onRestore) onRestore();
    } catch (error) {
      console.error('Error restoring file:', error);
      toast.error(t('Failed to restore file'));
    } finally {
      setIsRestoring(null);
    }
  };

  const handleDeletePermanently = async (fileId: number, chatId: string, messageId: string) => {
    setIsDeleting(fileId);
    
    try {
      // Удаление файла навсегда из телеграма
      await client.deleteMessages('me', [parseInt(messageId)], { revoke: true });
      
      // Удаление из базы данных
      await deleteFilePermanently.mutateAsync({ fileId });
      toast.success(t('File deleted permanently'));
      refetch();
    } catch (error) {
      console.error('Error deleting file permanently:', error);
      toast.error(t('Failed to delete file permanently'));
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <TrashIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium">{t('Trash is empty')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('Deleted files will appear here')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 gap-2 p-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between rounded-lg border p-3 bg-background hover:bg-accent"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">
                  <XIcon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <h4 className="font-medium">{file.filename}</h4>
                  <p className="text-xs text-muted-foreground">
                    {file.deletedAt ? new Date(file.deletedAt).toLocaleDateString() : 'N/A'} |{' '}
                    {Math.round(file.size / 1024)} KB
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRestore(file.id, file.chatId, file.messageId)}
                  disabled={isRestoring === file.id}
                >
                  {isRestoring === file.id ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-current"></div>
                      {t('Restoring...')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <RotateCcwIcon size={16} />
                      {t('Restore')}
                    </span>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeletePermanently(file.id, file.chatId, file.messageId)}
                  disabled={isDeleting === file.id}
                >
                  {isDeleting === file.id ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-current"></div>
                      {t('Deleting...')}
                    </span>
                  ) : (
                    t('Delete permanently')
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}