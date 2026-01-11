'use client';

import { XIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../ui/button';
import { Progress } from '../ui/progress';

interface DownloadProgressProps {
  fileName: string;
  fileSize: number;
  onCancel?: () => void;
  onDownloadComplete?: () => void;
  onError?: (error: Error) => void;
  progress?: number; // Добавляем возможность передавать прогресс извне
}

export function DownloadProgress({
  fileName,
  fileSize,
  onCancel,
  onDownloadComplete,
  onError,
  progress = 0,
}: DownloadProgressProps) {
  const [internalProgress, setInternalProgress] = useState<number>(progress);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  if (progress !== internalProgress) {
    setInternalProgress(progress);
  }

  if (progress === 100 && !isCompleted) {
    setIsCompleted(true);
    if (onDownloadComplete) {
      onDownloadComplete();
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadedSize = (internalProgress / 100) * fileSize;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-lg border bg-background p-4 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-medium truncate">{fileName}</h3>
        {!isCompleted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="h-6 w-6 p-0"
          >
            <XIcon size={16} />
          </Button>
        )}
      </div>
      
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {formatFileSize(downloadedSize)} / {formatFileSize(fileSize)}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {Math.round(internalProgress)}%
        </span>
      </div>
      
      <Progress value={internalProgress} className="mt-2" />
      
      {!isCompleted && (
        <p className="mt-2 text-xs text-muted-foreground">Скачивание...</p>
      )}
      
      {isCompleted && (
        <p className="mt-2 text-xs text-primary">Загрузка завершена!</p>
      )}
      
      {error && (
        <p className="mt-2 text-xs text-destructive">Ошибка: {error.message}</p>
      )}
    </div>
  );
}