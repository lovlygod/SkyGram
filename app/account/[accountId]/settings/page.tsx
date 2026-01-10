'use client';

import { SettingsPanel } from '#/lib/components/common/settings-panel';

interface PageProps {
  params: {
    accountId: string;
  };
}

function Page({ params }: PageProps) {
  return <SettingsPanel accountId={params.accountId} />;
}

export default Page;
