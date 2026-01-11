'use client';

import { XIcon, ZoomInIcon, ZoomOutIcon, RotateCwIcon } from 'lucide-react';
import { useState, useEffect } from 'react';

import { useTelegramClient } from '#/lib/client/context';
import { Button } from '../ui/button';
import { Dialog, DialogContent } from '../ui/dialog';

interface FilePreviewProps {
  file: {
    filename: string;
    filetype: string;
    size: number;
    chatId: string;
    messageId: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  currentFileIndex?: number;
  totalFiles?: number;
}

export function FilePreview({
  file,
  isOpen,
  onClose,
  onNext,
  onPrev,
  currentFileIndex,
  totalFiles,
}: FilePreviewProps) {
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  
  const client = useTelegramClient();

  useEffect(() => {
    setScale(1);
    setRotation(0);
    setIsLoading(true);
    setError(null);
    setMediaUrl(null); // Сброс URL при смене файла
  }, [file]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const loadMedia = async () => {
      try {
        const result = await client.getMessages(file.chatId, { ids: parseInt(file.messageId) });

        if (!cancelled && result.length > 0) {
          const message = result[0];
          if (message) {
            const buffer = await client.downloadMedia(message, {
              progressCallback: (received, total) => {
              }
            });
            if (!cancelled && buffer) {
              const blob = new Blob([buffer], { type: file.filetype });
              const url = URL.createObjectURL(blob);
              setMediaUrl(url);
              setIsLoading(false);
            } else {
              setError('Не удалось загрузить файл');
              setIsLoading(false);
            }
          } else {
            setError('Сообщение не найдено');
            setIsLoading(false);
          }
        } else {
          setError('Сообщение не найдено');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading media:', err);
        if (!cancelled) {
          setError('Не удалось загрузить файл');
          setIsLoading(false);
        }
      }
    };

    loadMedia();

    return () => {
      cancelled = true;
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [isOpen, file, client]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.2, 3)); // Максимальное увеличение 3x
 };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.2, 0.2)); // Минимальное уменьшение 0.2x
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
  };

  const getFileType = (): 'image' | 'video' | 'document' | 'other' => {
    if (file.filetype.startsWith('image/')) {
      return 'image';
    } else if (file.filetype.startsWith('video/')) {
      return 'video';
    } else if (
      file.filetype.includes('pdf') ||
      file.filetype.includes('word') ||
      file.filetype.includes('excel') ||
      file.filetype.includes('powerpoint') ||
      file.filetype.includes('text')
    ) {
      return 'document';
    } else {
      return 'other';
    }
  };

  const fileType = getFileType();

  const renderFilePreview = () => {
    switch (fileType) {
      case 'image':
        return (
          <div className="flex h-full w-full items-center justify-center">
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt={file.filename}
                className="max-h-[70vh] max-w-[90vw] object-contain"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease'
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground">Загрузка изображения...</div>
            )}
          </div>
        );
        
      case 'video':
        return (
          <div className="flex h-full w-full items-center justify-center">
            {mediaUrl ? (
              <video
                controls
                className="max-h-[70vh] max-w-[90vw]"
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease'
                }}
              >
                <source src={mediaUrl} type={file.filetype} />
                Ваш браузер не поддерживает воспроизведение видео.
              </video>
            ) : (
              <div className="text-center text-muted-foreground">Загрузка видео...</div>
            )}
          </div>
        );
        
      case 'document':
        return (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="mb-4 rounded-lg bg-muted p-8 text-center">
                <h3 className="mb-2 text-xl font-semibold">{file.filename}</h3>
                <p className="text-muted-foreground">Предварительный просмотр документа недоступен</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Тип: {file.filetype} | Размер: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Для просмотра документа нажмите кнопку "Скачать" или "Открыть"
              </p>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="mb-4 rounded-lg bg-muted p-8 text-center">
                <h3 className="mb-2 text-xl font-semibold">{file.filename}</h3>
                <p className="text-muted-foreground">Предварительный просмотр недоступен</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Тип: {file.filetype} | Размер: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                Для открытия файла нажмите кнопку "Скачать" или "Открыть"
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[90vw] max-h-[90vh] w-full h-full p-0 flex flex-col border-0"
        style={{ maxWidth: 'calc(100vw - 2rem)', maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Панель управления */}
        <div className="flex items-center justify-between border-b p-2">
          <div className="flex items-center gap-2">
            <h3 className="font-medium truncate max-w-xs">{file.filename}</h3>
            {currentFileIndex !== undefined && totalFiles !== undefined && (
              <span className="text-sm text-muted-foreground">
                {currentFileIndex + 1} из {totalFiles}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {fileType === 'image' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  className="h-8 w-8 p-0"
                >
                  <ZoomInIcon size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOutIcon size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRotate}
                  className="h-8 w-8 p-0"
                >
                  <RotateCwIcon size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-8 w-8 p-0"
                >
                  Reset
                </Button>
              </>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <XIcon size={16} />
            </Button>
          </div>
        </div>
        
        {/* Контролы навигации между файлами */}
        {(onNext || onPrev) && (
          <div className="flex justify-between p-2 border-b">
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              disabled={!onPrev}
              className="flex items-center gap-2"
            >
              &larr; Предыдущий
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onNext}
              disabled={!onNext}
              className="flex items-center gap-2"
            >
              Следующий &rarr;
            </Button>
          </div>
        )}
        
        {/* Контент предварительного просмотра */}
        <div className="flex-1 overflow-auto bg-background flex items-center justify-center">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center text-red-500">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => {
                    setIsLoading(true);
                    setError(null);
                  }}
                >
                  Повторить попытку
                </Button>
              </div>
            </div>
          )}
          
          {!isLoading && !error && renderFilePreview()}
        </div>
      </DialogContent>
    </Dialog>
  );
}