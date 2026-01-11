import { useState, useEffect } from 'react';
import { translations } from '#/lib/i18n/translations';
import { useTheme } from '#/lib/context/theme-context';

export function useTranslation() {
  const { language } = useTheme();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const t = (key: keyof typeof translations.en) => {
    // Если еще не на клиенте, возвращаем английский вариант для избежания гидрации
    if (!isClient) {
      return translations.en[key] || key;
    }

    if (!language) {
      // Если язык еще не установлен, используем английский по умолчанию
      return translations.en[key] || key;
    }
    const langTranslations = translations[language];
    return langTranslations[key] || translations.en[key] || key;
  };
  
  return { t, language: isClient ? language : undefined };
}