'use client';

import { Globe } from 'lucide-react';

import { useTheme } from '#/lib/context/theme-context';

import {
  Button,
} from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

export function LanguageSwitcher() {
  const { language, setLanguage } = useTheme();

  return (
    <div className="flex items-center">
      <Globe className="h-4 w-4 mr-2" />
      <Select value={language} onValueChange={(value: 'en' | 'ru' | 'uk' | 'kk') => setLanguage(value)}>
        <SelectTrigger className="w-[80px] h-8">
          <SelectValue placeholder="Lang" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">EN</SelectItem>
          <SelectItem value="ru">RU</SelectItem>
          <SelectItem value="uk">UK</SelectItem>
          <SelectItem value="kk">KK</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}