'use client';

import { Globe } from 'lucide-react';

import { useTheme } from '#/lib/context/theme-context';
import { ClientOnlySelect } from './client-only-select';

import {
  Button,
} from '../ui/button';
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTheme();

  const handleLanguageChange = (value: string) => {
    setLanguage(value as 'en' | 'ru' | 'uk' | 'kk');
 };

  return (
    <div className="flex items-center">
      <Globe className="h-4 w-4 mr-2" />
      <ClientOnlySelect
        value={language}
        onValueChange={handleLanguageChange}
        triggerClassName="w-[80px] h-8"
      >
        <SelectItem value="en">EN</SelectItem>
        <SelectItem value="ru">RU</SelectItem>
        <SelectItem value="uk">UK</SelectItem>
        <SelectItem value="kk">KK</SelectItem>
      </ClientOnlySelect>
    </div>
  );
}