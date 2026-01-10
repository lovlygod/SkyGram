'use client';

import { EditIcon } from 'lucide-react';
import { toast } from 'sonner';

import { useRef, useState } from 'react';

import { Button } from '#/lib/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/lib/components/ui/dialog';
import { Input } from '#/lib/components/ui/input';
import { useFileManager } from '#/lib/file-manager';
import { trpc } from '#/lib/trpc/client';
import { useTranslation } from '#/lib/hooks/useTranslation';

type RenameModalProps = {
  isSelected: boolean;
  type: 'folder' | 'file';
};

function RenameModal({
  isSelected,
  type,
}: RenameModalProps) {
  const {
    refetch,
    selectedFile,
    selectedFolder,
  } = useFileManager();
  const [isOpen, setIsOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const renameFile =
    trpc.renameFile.useMutation();
  const renameFolder =
    trpc.renameFolder.useMutation();

  function handleSubmit() {
    const name = nameRef.current?.value;
    if (!name) {
      toast.error(t('Please enter a name'));
      return;
    }

    if (selectedFile) {
      renameFile
        .mutateAsync({
          name,
          id: selectedFile.id,
        })
        .then(() => {
          setIsOpen(false);
          refetch();
          toast.success(t('Renamed successfully'));
        });
    } else if (selectedFolder) {
      renameFolder
        .mutateAsync({
          name,
          id: selectedFolder.id,
        })
        .then(() => {
          setIsOpen(false);
          refetch();
          toast.success(t('Renamed successfully'));
        });
    }
  }
  return (
    <div>
      <Dialog
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <DialogTrigger asChild>
          <Button
            icon={<EditIcon size={18} />}
            variant="ghost"
            size="sm"
            disabled={!isSelected}
          >
            {t('Rename')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {t('Rename')} {t(type)}
            </DialogTitle>
            <DialogDescription>
              {t('Enter the new name for the')} {t(type)}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Input
              id="name"
              className="mt-1"
              placeholder={t('Enter folder name')}
              ref={nameRef}
              defaultValue={
                type === 'file'
                  ? selectedFile?.filename
                  : selectedFolder?.name
              }
            />
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              // isLoading={rename.isLoading}
            >
              {t('Submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RenameModal;
