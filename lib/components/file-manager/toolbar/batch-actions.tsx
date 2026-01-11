'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '#/lib/components/ui/button';
import { useFileManager } from '#/lib/file-manager';
import { trpc } from '#/lib/trpc/client';
import { useTranslation } from '#/lib/hooks/useTranslation';

interface BatchActionsToolbarProps {
  onBatchOperationComplete?: () => void;
  onBatchOperationStart?: () => void;
}

export const BatchActionsToolbar = ({ onBatchOperationComplete }: BatchActionsToolbarProps) => {
  const { selectedFiles, clearSelectedFiles, refetch } = useFileManager();
  
  const { t } = useTranslation();

  const deleteFilesMutation = trpc.batchDeleteFiles.useMutation({
    onMutate: () => {
      toast.loading(`${selectedFiles.length} ${t('files')} ${t('selected_for_deletion')}...`);
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success(`${selectedFiles.length} ${t('files')} ${t('Files deleted successfully')}`);
      clearSelectedFiles();
      refetch();
      onBatchOperationComplete?.();
    },
    onError: (error) => {
      toast.dismiss();
      console.error('Error deleting files:', error);
      toast.error(t('Failed to delete files'));
    }
  });

  const moveFilesMutation = trpc.batchMoveFiles.useMutation({
    onMutate: () => {
      toast.loading(`${selectedFiles.length} ${t('files')} ${t('selected_for_moving')}...`);
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success(`${selectedFiles.length} ${t('files')} ${t('Files moved successfully')}`);
      clearSelectedFiles();
      refetch();
      onBatchOperationComplete?.();
    },
    onError: (error) => {
      toast.dismiss();
      console.error('Error moving files:', error);
      toast.error(t('Failed to move files'));
    }
  });

  const bookmarkFilesMutation = trpc.batchBookmarkFiles.useMutation({
    onMutate: () => {
      toast.loading(`${selectedFiles.length} ${t('files')} ${t('selected_for_bookmarking')}...`);
    },
    onSuccess: () => {
      toast.dismiss();
      toast.success(`${selectedFiles.length} ${t('files')} ${t('Files bookmark status updated successfully')}`);
      clearSelectedFiles();
      refetch();
      onBatchOperationComplete?.();
    },
    onError: (error) => {
      toast.dismiss();
      console.error('Error updating bookmarks:', error);
      toast.error(t('Failed to update bookmarks'));
    }
  });

 const [activeOperation, setActiveOperation] = useState<'delete' | 'move' | 'bookmark' | 'unbookmark' | null>(null);

  const handleDeleteFiles = useCallback(() => {
    if (selectedFiles.length === 0) return;
    
    setActiveOperation('delete');
    deleteFilesMutation.mutate(selectedFiles.map(file => file.id));
  }, [selectedFiles, deleteFilesMutation]);

  const handleMoveFiles = useCallback(() => {
    if (selectedFiles.length === 0) return;
    
    setActiveOperation('move');
    toast.info(t('Select destination folder functionality would appear here'));
    setActiveOperation(null);
  }, [selectedFiles, t]);

  const handleBookmarkFiles = useCallback(() => {
    if (selectedFiles.length === 0) return;
    
    setActiveOperation('bookmark');
    bookmarkFilesMutation.mutate({
      fileIds: selectedFiles.map(file => file.id),
      bookmark: true
    });
  }, [selectedFiles, bookmarkFilesMutation, t]);

  const handleUnbookmarkFiles = useCallback(() => {
    if (selectedFiles.length === 0) return;
    
    setActiveOperation('unbookmark');
    bookmarkFilesMutation.mutate({
      fileIds: selectedFiles.map(file => file.id),
      bookmark: false
    });
  }, [selectedFiles, bookmarkFilesMutation, t]);

  const handleCancelOperation = useCallback(() => {
    if (activeOperation) {
      toast.info(`${t('Operation')} ${activeOperation} ${t('cancelled')}`);
      setActiveOperation(null);
    }
  }, [activeOperation, t]);

  if (selectedFiles.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 bg-gray-800 text-white p-4 z-50 shadow-lg flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <span className="font-medium">
          {selectedFiles.length} {t('files')} {t('selected')}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={clearSelectedFiles}
        >
          {t('Cancel selection')}
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        {activeOperation && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancelOperation}
          >
            {t('Cancel Operation')}
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteFiles}
          disabled={!!activeOperation}
        >
          {t('Delete')}
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={handleMoveFiles}
          disabled={!!activeOperation}
        >
          {t('Move')}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleBookmarkFiles}
          disabled={!!activeOperation}
        >
          {t('Bookmark')}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleUnbookmarkFiles}
          disabled={!!activeOperation}
        >
          {t('Unbookmark')}
        </Button>
      </div>
    </div>
  );
};