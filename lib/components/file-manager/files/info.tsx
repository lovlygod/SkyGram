import {
  DownloadIcon,
  TrashIcon,
  XIcon,
} from 'lucide-react';
import prettyBytes from 'pretty-bytes';
import { useState } from 'react';

import { useTelegramClient } from '#/lib/client/context';
import { Button } from '#/lib/components/ui/button';
import { DownloadProgress } from '#/lib/components/file-manager/download-progress';
import type { File } from '#/lib/db/schema';
import { useTranslation } from '#/lib/hooks/useTranslation';

function FileInfo({
  file,
  onClose,
}: {
  file: File;
  onClose: () => void;
}) {
  const client = useTelegramClient();
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [showDownloadProgress, setShowDownloadProgress] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const { t } = useTranslation();

  async function handleDownload() {
    setIsDownloading(true);
    setShowDownloadProgress(true);
    setDownloadProgress(0);
    
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
        const buffer = await client.downloadMedia(message, {
          progressCallback: (received, total) => {
            const progress = (Number(received) / Number(total)) * 100;
            setDownloadProgress(progress);
          }
        });

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
    } finally {
      setIsDownloading(false);
      setDownloadProgress(100);
      setTimeout(() => setShowDownloadProgress(false), 2000); // Показываем прогресс еще 2 секунды после завершения
    }
  }

 return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between gap-6 border-b bg-background px-4">
        <h1 className="line-clamp-2 font-semibold">
          {file.filename}
        </h1>
        <XIcon
          size={20}
          onClick={() => onClose()}
        />
      </div>
      <div className="flex-1 space-y-2 overflow-auto">
        <div className="space-y-4 p-4">
          <div>
            <h1 className="text-xs uppercase text-muted-foreground">
              {t('Size')}
            </h1>
            <span className="mt-1 font-semibold">
              {prettyBytes(file.size)}
            </span>
          </div>
          <div>
            <h1 className="text-xs uppercase text-muted-foreground">
              {t('Type')}
            </h1>
            <span className="mt-1 font-semibold">
              {file.filetype}
            </span>
          </div>
          <div>
            <h1 className="text-xs uppercase text-muted-foreground">
              {t('Created')}
            </h1>
            <span className="mt-1 font-semibold">
              {new Date(
                file.createdAt,
              ).toDateString()}
            </span>
          </div>
          <div>
            <h1 className="text-xs uppercase text-muted-foreground">
              {t('Message ID')}
            </h1>
            <span className="mt-1 font-semibold">
              {file.messageId}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center border-t bg-background p-2">
        <Button
          icon={<DownloadIcon size={20} />}
          size="sm"
          onClick={handleDownload}
          isLoading={isDownloading}
        >
          {t('Download')}
        </Button>
      </div>
      
      {showDownloadProgress && (
        <DownloadProgress
          fileName={file.filename}
          fileSize={file.size}
          progress={downloadProgress}
          onDownloadComplete={() => {
            // Дополнительные действия после завершения скачивания
          }}
          onCancel={() => {
            // Обработка отмены скачивания
          }}
          onError={(error) => {
            console.error('Download error:', error);
          }}
        />
      )}
    </div>
  );
}

export default FileInfo;
