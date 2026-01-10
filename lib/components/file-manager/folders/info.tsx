import { XIcon } from 'lucide-react';

import { Input } from '#/lib/components/ui/input';
import type { Folder } from '#/lib/db/schema';
import { useTranslation } from '#/lib/hooks/useTranslation';

function FolderInfo({
  folder,
  onClose,
}: {
  folder: Folder;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-16 items-center justify-between border-b bg-background px-4">
        <h1 className="text-xl font-bold">
          {folder.name}
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
              {t('Total Files')}
            </h1>
            <span className="mt-1 font-semibold">
              {folder.totalFiles ?? '0'}
            </span>
          </div>
          <div>
            <h1 className="text-xs uppercase text-muted-foreground">
              {t('Total Size')}
            </h1>
            <span className="mt-1 font-semibold">
              {(
                (folder.totalSize ?? 0) / 1024
              ).toFixed(2)}{' '}
              KB
            </span>
          </div>
        </div>
      </div>
      <div className="border-t bg-background p-2">
        <Input placeholder={t('Comment')} />
      </div>
    </div>
  );
}

export default FolderInfo;
