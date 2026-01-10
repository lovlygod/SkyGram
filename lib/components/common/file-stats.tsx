import prettyBytes from 'pretty-bytes';

import { Card } from '../ui/card';
import { useTranslation } from '#/lib/hooks/useTranslation';

function FileStats({
  totalFiles,
  totalSize,
}: {
  totalFiles: number;
  totalSize: number;
}) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <p className="text-sm uppercase text-muted-foreground">
        {t('File Stats')}
      </p>
      <Card className="p-4">
        <h1 className="font-semibold">
          {t('Total Files')}
        </h1>
        <p className="text-muted-foreground">
          {totalFiles} {totalFiles > 1 ? t('files') : t('file')}
        </p>
      </Card>
      <Card className="p-4">
        <h1 className="font-semibold">
          {t('Size Used')}
        </h1>
        <p className="text-muted-foreground">
          {prettyBytes(totalSize) || 0}
        </p>
      </Card>
    </div>
  );
}

export default FileStats;
