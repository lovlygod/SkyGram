'use client';

import { TrashFiles } from './trash-files';
import { useParams } from 'next/navigation';

export function TrashWrapper() {
  const params = useParams<{ accountId: string }>();
  
  return (
    <TrashFiles
      accountId={params.accountId}
      onRestore={() => {
        window.location.reload();
      }}
    />
  );
}