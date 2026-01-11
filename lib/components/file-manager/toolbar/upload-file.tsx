'use client';

import {
  FileIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Api } from 'telegram';
import { CustomFile } from 'telegram/client/uploads';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  useParams,
  useSearchParams,
} from 'next/navigation';

import { useTelegramClient } from '#/lib/client/context';
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
import { useFileManager } from '#/lib/file-manager';
import { trpc } from '#/lib/trpc/client';
import { useTranslation } from '#/lib/hooks/useTranslation';

import { Progress } from '../../ui/progress';

function UploadModal() {
  const params = useParams<{ accountId: string }>();
  const client = useTelegramClient();
  const searchParam = useSearchParams();
  const { refetch } = useFileManager();
  const [progress, setProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] =
    useState(0);
  const { t } = useTranslation();

  const createFile =
    trpc.createFile.useMutation();

  const fileRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] =
    useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] =
    useState(false);
  const [cancelledFiles, setCancelledFiles] = useState<Set<string>>(new Set());

  const folderPath =
    searchParam?.get('path') ?? '/';

  async function uploadFile(file: File) {
      if (cancelledFiles.has(file.name)) {
        return;
      }
  
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const toUpload = new CustomFile(
        file.name,
        file.size,
        '',
        buffer,
      );
  
      try {
        const res = await client.sendFile('me', {
          file: toUpload,
          forceDocument: true,
          workers: 10,
          progressCallback: (progress) => {
            if (cancelledFiles.has(file.name)) {
              return;
            }
            setProgress(progress * 100);
          },
        });
  
        if (cancelledFiles.has(file.name)) {
          return;
        }
  
        const peer = res.peerId as Api.PeerUser;
        const chatId = peer.userId
          .valueOf()
          .toString();
        const msgId = res.id.toString();
  
        if (params?.accountId) {
          await createFile.mutateAsync({
            folderPath,
            filename: file.name,
            filetype: file.type,
            size: file.size,
            accountId: params.accountId,
            chatId,
            messageId: msgId,
            fileId: res.id.toString(),
          });
        }
      } catch (error) {
        if (cancelledFiles.has(file.name)) {
          return;
        }
        console.error('Upload error:', error);
        throw error;
      }
    }

  async function handleSubmit() {
    if (files.length === 0) {
      toast.error(t('No files selected'));
      return;
    }

    if (!params?.accountId) {
      toast.error(t('Account ID is missing'));
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      setCurrentFileIndex(i);
      setProgress(0);
      await uploadFile(files[i]);
    }

    refetch();
    setIsOpen(false);
    setFiles([]);
    setIsUploading(false);
    setProgress(0);
    setCurrentFileIndex(0);
    setCancelledFiles(new Set());
  }

  useEffect(() => {
    if (files.length > 0) {
      setIsDragging(false);
    }
  }, [files]);

  return (
    <div>
      <Dialog
        open={isOpen}
        onOpenChange={(val) => {
          if (progress > 0) return;
          if (!val) {
            setCancelledFiles(new Set());
          }
          setIsOpen(val);
        }}
      >
        <DialogTrigger asChild>
          <Button
            icon={<UploadIcon size={18} />}
            variant="ghost"
            size="sm"
          >
            {t('Upload')}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {t('Upload files')}
            </DialogTitle>
            <DialogDescription>
              {t('Drag and drop files or click to upload')}
            </DialogDescription>
          </DialogHeader>
          {files.length > 0 ? (
            <div className="flex flex-col gap-2">
              {files.map((file, index) => (
                <div
                  key={file.name}
                  className="flex items-center gap-2 rounded-xl border bg-muted p-4"
                >
                  <FileIcon
                    size={24}
                    className="flex-shrink-0"
                  />
                  <span className="break-all text-sm">
                    {file.name}
                  </span>
                  {isUploading &&
                    index ===
                      currentFileIndex && (
                      <Progress
                        value={progress}
                        className="w-20"
                      />
                    )}
                  <div className="flex-1" />
                  <XIcon
                    size={16}
                    onClick={() => {
                      const fileToRemove = files[index];
                      setCancelledFiles(prev => new Set(prev).add(fileToRemove.name));
                      
                      setFiles(
                        files.filter(
                          (_, i) => i !== index,
                        ),
                      );
                    }}
                    className="flex-shrink-0"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`flex h-60 flex-col items-center justify-center gap-2 rounded-xl border ${
                isDragging
                  ? 'bg-accent'
                  : 'bg-muted'
              }`}
              onClick={() => {
                fileRef.current?.click();
              }}
              onDragEnter={() => {
                setIsDragging(true);
              }}
              onDragLeave={() => {
                setIsDragging(false);
              }}
              onDrop={(ev) => {
                ev.preventDefault();
                const droppedFiles = Array.from(
                  ev.dataTransfer?.files || [],
                );
                setFiles((prev) => [
                  ...prev,
                  ...droppedFiles,
                ]);
              }}
              onDragOver={(ev) => {
                ev.preventDefault();
              }}
            >
              <input
                type="file"
                className="hidden"
                multiple
                ref={fileRef}
                onChange={(e) => {
                  const selectedFiles =
                    Array.from(
                      e.target.files || [],
                    );
                  setFiles((prev) => [
                    ...prev,
                    ...selectedFiles,
                  ]);
                }}
              />
              {isDragging ? (
                <div>{t('Drop here')}</div>
              ) : (
                <>
                  <FileIcon size={32} />
                  <span className="text-sm">
                    {t('Drag and drop files or click to upload')}
                  </span>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            {files.length > 0 && (
              <Button
                onClick={handleSubmit}
                isLoading={isUploading}
              >
                {t('Upload')} {files.length} {files.length > 1 ? t('files') : t('file')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UploadModal;
