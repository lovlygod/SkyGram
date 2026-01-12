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
    
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '100';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4';
    modalContent.innerHTML = `
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Select destination folder</h3>
        <button id="closeModal" class="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div id="folderList" class="max-h-60 overflow-y-auto"></div>
      <div class="mt-4 flex justify-end space-x-2">
        <button id="cancelMove" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">
          ${t('Cancel')}
        </button>
        <button id="confirmMove" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700" disabled>
          ${t('Move')}
        </button>
      </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const folderList = document.getElementById('folderList')!;
    folderList.innerHTML = '<p class="text-gray-50">Loading folders...</p>';
    
    import('#/lib/trpc/client').then(({ trpc }) => {
      const utils = trpc.useUtils();
      utils.getFolders.fetch({ accountId: selectedFiles[0].accountId, path: '/' })
        .then((folders: any[]) => {
          folderList.innerHTML = '';
          
          if (folders.length === 0) {
            folderList.innerHTML = '<p class="text-gray-500">No folders found</p>';
            return;
          }
          
          folders.forEach((folder: any) => {
            const folderElement = document.createElement('div');
            folderElement.className = 'flex items-center p-2 hover:bg-gray-100 cursor-pointer rounded';
            folderElement.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>${folder.name}</span>
            `;
            
            (window as any).selectedFolder = null;
            
            folderElement.addEventListener('click', () => {
              document.querySelectorAll('#folderList div').forEach(el => {
                el.classList.remove('bg-blue-100');
              });
              
              folderElement.classList.add('bg-blue-100');
              (window as any).selectedFolder = folder;
              
              (document.getElementById('confirmMove') as HTMLButtonElement).disabled = false;
            });
            
            folderList.appendChild(folderElement);
          });
          
          (document.getElementById('confirmMove') as HTMLButtonElement).onclick = () => {
            if ((window as any).selectedFolder) {
              setActiveOperation('move');
              moveFilesMutation.mutate({
                fileIds: selectedFiles.map(file => file.id),
                targetPath: (window as any).selectedFolder.path
              });
              document.body.removeChild(modal);
            }
          };
        })
        .catch((error: any) => {
          console.error('Error loading folders:', error);
          folderList.innerHTML = '<p class="text-red-500">Error loading folders</p>';
        });
    });
    
    document.getElementById('closeModal')!.onclick = () => {
      document.body.removeChild(modal);
      setActiveOperation(null);
    };
    
    document.getElementById('cancelMove')!.onclick = () => {
      document.body.removeChild(modal);
      setActiveOperation(null);
    };
    
    modal.onclick = (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
        setActiveOperation(null);
      }
    };
  }, [selectedFiles, moveFilesMutation, t]);

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
          onClick={() => {
            selectedFiles.forEach(file => {
              trpc.copyFile.useMutation().mutate({ fileId: file.id });
            });
            refetch();
          }}
          disabled={!!activeOperation}
        >
          {t('Copy')}
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