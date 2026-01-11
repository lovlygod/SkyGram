'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '../ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { useTranslation } from '#/lib/hooks/useTranslation';

interface DeleteConfirmationProps {
  file: {
    id: number;
    filename: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (fileId: number) => void;
  onCancel?: () => void;
}

export function DeleteConfirmation({
  file,
  isOpen,
  onClose,
  onConfirm,
  onCancel,
}: DeleteConfirmationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(5); // 5 секунд на отмену
  const { t } = useTranslation();

  useEffect(() => {
    if (isOpen) {
      setTimeLeft(5);
      setIsAnimating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isOpen && timeLeft > 0) {
      timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (isOpen && timeLeft === 0) {
      handleConfirm();
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOpen, timeLeft]);

  const handleConfirm = () => {
    setIsAnimating(true);
    setTimeout(() => {
      onConfirm(file.id);
      setIsAnimating(false);
      onClose();
      setTimeLeft(5);
    }, 300);
  };

  const handleCancel = () => {
    setIsAnimating(true);
    setTimeout(() => {
      if (onCancel) {
        onCancel();
      } else {
        onClose();
        setIsAnimating(false);
        setTimeLeft(5);
      }
    }, 300);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AnimatePresence>
        {isOpen && (
          <AlertDialogContent
            className="sm:max-w-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 500 }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle className="text-lg font-semibold">
                  {t('Delete file?')}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-muted-foreground">
                  {t('You are about to delete the file')} <strong>"{file.filename}"</strong>.
                  {t(' The file will be moved to trash and can be restored within 30 days.')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{t('Auto-delete info')}</span>
                  <span className="font-semibold text-destructive">
                    {timeLeft} {t('seconds')}
                  </span>
                </div>
                
                <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full bg-destructive"
                    initial={{ width: '0%' }}
                    animate={{ width: `${(timeLeft / 5) * 100}%` }}
                    transition={{ duration: 1, ease: 'linear' }}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    {t('Cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleConfirm}
                    disabled={isAnimating}
                    className="flex-1"
                  >
                    {t('Delete')}
                  </Button>
                </div>
              </div>
            </motion.div>
          </AlertDialogContent>
        )}
      </AnimatePresence>
    </AlertDialog>
  );
}