'use client';

import { Card, CardContent, CardHeader, CardTitle } from '#/lib/components/ui/card';
import { ThemeToggle } from './theme-toggle';
import { LanguageSwitcher } from './language-switcher';
import { Button } from '#/lib/components/ui/button';
import { useTranslation } from '#/lib/hooks/useTranslation';
import { Trash2, Lock, Bell, User, Shield } from 'lucide-react';
import { useState } from 'react';
import { Switch } from '#/lib/components/ui/switch';
import { Label } from '#/lib/components/ui/label';

interface SettingsPanelProps {
  accountId?: string;
}

export function SettingsPanel({ accountId }: SettingsPanelProps) {
  const { t } = useTranslation();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <User className="h-5 w-5 text-primary" />
            </div>
            {t('Appearance')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{t('Theme')}</h3>
              <p className="text-sm text-muted-foreground">{t('Choose your preferred theme')}</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">{t('Language')}</h3>
              <p className="text-sm text-muted-foreground">{t('Select your preferred language')}</p>
            </div>
            <LanguageSwitcher />
          </div>
        </CardContent>
      </Card>


    </div>
  );
}