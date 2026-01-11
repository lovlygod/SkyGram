'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
type Language = 'en' | 'ru' | 'uk' | 'kk';

interface ThemeContextType {
  theme: Theme;
  language: Language;
  toggleTheme: () => void;
  setLanguage: (lang: Language) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Вспомогательные функции для получения начальных значений синхронно
function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      return savedTheme;
    }
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return systemPrefersDark ? 'dark' : 'light';
  }
  return 'light'; // Значение по умолчанию для серверного рендеринга
}

function getInitialLanguage(): Language {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('language') as Language | null;
    if (savedLanguage) {
      return savedLanguage;
    }
  }
  return 'en'; // Значение по умолчанию
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());

  useEffect(() => {
    // Обновляем тему при монтировании компонента
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  const setLanguageHandler = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
    // Обновляем атрибут языка в html элементе
    document.documentElement.lang = lang;
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      language,
      toggleTheme,
      setLanguage: setLanguageHandler
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}