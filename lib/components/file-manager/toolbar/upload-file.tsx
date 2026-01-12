'use client';

import {
  FileIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Api } from 'telegram';
import { CustomFile } from 'telegram/client/uploads';

import { Buffer } from 'buffer';

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

// Максимальный размер файла (50 МБ)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Разрешенные типы файлов
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-bzip2',
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-ms-wmv',
  'video/x-flv',
  'audio/mpeg',
  'audio/wav',
  'audio/x-ms-wma',
  'audio/aac',
  'application/json',
  'text/csv',
  'application/octet-stream'
];

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

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`${file.name} exceeds maximum size of 50MB`);
      return false;
    }

    if (!ALLOWED_FILE_TYPES.includes(file.type) && file.type !== '') {
      toast.error(`File type not allowed: ${file.name}`);
      return false;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension) {
      const allowedExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'webp',
        'pdf', 'txt', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
        'mp4', 'mov', 'avi', 'wmv', 'flv',
        'mp3', 'wav', 'wma', 'aac',
        'json', 'csv'
      ];
      
      if (!allowedExtensions.includes(fileExtension)) {
        toast.error(`File extension not allowed: ${file.name}`);
        return false;
      }
    }

    if (file.name.includes('../') || file.name.includes('..\\')) {
      toast.error(`Invalid file name: ${file.name}`);
      return false;
    }

    return true;
 };

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
        buffer as any,
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
            setProgress(progress * 10);
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

    const validFiles: File[] = [];
    for (const file of files) {
      if (validateFile(file)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      return;
    }

    setFiles(validFiles);

    setIsUploading(true);

    for (let i = 0; i < validFiles.length; i++) {
      setCurrentFileIndex(i);
      setProgress(0);
      await uploadFile(validFiles[i]);
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
                        ) as File[],
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
                
                const validDroppedFiles: File[] = [];
                for (const file of droppedFiles) {
                  if (validateFile(file)) {
                    validDroppedFiles.push(file);
                  }
                }
                
                setFiles((prev) => [
                  ...prev,
                  ...validDroppedFiles,
                ] as File[]);
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
                  
                  const validSelectedFiles: File[] = [];
                  for (const file of selectedFiles) {
                    if (validateFile(file)) {
                      validSelectedFiles.push(file);
                    }
                  }
                  
                  setFiles((prev) => [
                    ...prev,
                    ...validSelectedFiles,
                  ] as File[]);
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
