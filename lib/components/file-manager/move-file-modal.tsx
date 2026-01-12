'use client';

import { FolderIcon, MoveIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { trpc } from '#/lib/trpc/client';
import { useTranslation } from '#/lib/hooks/useTranslation';

interface MoveFileModalProps {
  file: {
    id: number;
    filename: string;
  } | null;
  isOpen: boolean;
 onClose: () => void;
  onMove: (fileId: number, targetPath: string) => void;
 accountId: string;
}

export function MoveFileModal({ file, isOpen, onClose, onMove, accountId }: MoveFileModalProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>('/');
  const [currentPath, setCurrentPath] = useState<string>('/');
  const { t } = useTranslation();

  const { data: folders, isLoading } = trpc.getFolders.useQuery(
    { accountId, path: currentPath },
    { enabled: isOpen }
  );

  useEffect(() => {
    if (isOpen) {
      setCurrentPath('/');
      setSelectedFolder('/');
    }
  }, [isOpen]);

  const handleMove = () => {
    if (file && selectedFolder) {
      onMove(file.id, selectedFolder);
      onClose();
    }
  };

  const navigateToFolder = (path: string) => {
    setCurrentPath(path);
    setSelectedFolder(path);
 };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const pathParts = currentPath.split('/').filter(part => part !== '');
    pathParts.pop();
    const newPath = pathParts.length > 0 ? '/' + pathParts.join('/') : '/';
    setCurrentPath(newPath);
    setSelectedFolder(newPath);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MoveIcon size={20} />
            {t('Move')} "{file?.filename}"
          </DialogTitle>
          <DialogDescription>
            {t('Select destination folder for the file')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-2">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span>{t('Current Path:')}</span>
            <span className="truncate">{currentPath}</span>
          </div>
          
          {currentPath !== '/' && (
            <button
              onClick={navigateUp}
              className="mb-2 flex items-center gap-2 rounded-lg border p-2 hover:bg-accent"
            >
              <FolderIcon size={16} />
              ..
            </button>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : folders && folders.length > 0 ? (
            <div className="max-h-60 overflow-auto">
              {folders.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => navigateToFolder(folder.path ?? '/')}
                  className={`flex w-full items-center gap-2 rounded-lg border p-2 mb-1 hover:bg-accent ${
                    selectedFolder === folder.path ? 'bg-muted border-border' : ''
                  }`}
                >
                  <FolderIcon size={16} />
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">
              {t('No folders available')}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleMove} disabled={!selectedFolder || !file}>
            {t('Move')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}