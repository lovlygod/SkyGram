'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '../ui/button';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null);

  useEffect(() => {
    // Получаем начальное состояние темы
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    if (theme) {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      setTheme(newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
      localStorage.setItem('theme', newTheme);
    }
  };

  // Показываем пустую иконку до загрузки состояния темы, чтобы избежать гидрации
  if (theme === null) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {}}
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="h-5 w-5 opacity-0" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}