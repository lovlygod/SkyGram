'use client';

import { useEffect, useState } from 'react';

import { useTranslation } from '#/lib/hooks/useTranslation';

function VersionChecker() {
  const { t } = useTranslation();
  const version = process.env.version;
  const [latestVersion, setLatestVersion] =
    useState('');

  useEffect(() => {
    const savedVersion =
      localStorage.getItem('version');
    const savedAt =
      localStorage.getItem('version_at');

    if (savedVersion && savedAt) {
      const elapsedSeconds = Math.floor(
        (new Date().getTime() -
          new Date(savedAt).getTime()) /
          1000,
      );
      setLatestVersion(savedVersion);

      if (elapsedSeconds < 3600) {
        return;
      }
    }

    fetch(
      'https://api.github.com/repos/mxvsh/SkyGram/tags',
    )
      .then((response) => response.json())
      .then((data) => {
        if (data && data.length > 0) {
          const latest = data[0];
          if (latest && latest.name) {
            setLatestVersion(latest.name);
            localStorage.setItem(
              'version',
              latest.name,
            );
            localStorage.setItem(
              'version_at',
              new Date().toISOString(),
            );
          }
        }
      });
  }, []);

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {latestVersion &&
        latestVersion !== version
          ? t('Update available')
          : t('Latest version')}
      </p>
    </div>
  );
}

export default VersionChecker;
