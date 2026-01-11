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
    if (!isClient) {
      return translations.en[key] || key;
    }

    if (!language) {
      return translations.en[key] || key;
    }
    const langTranslations = translations[language];
    return langTranslations[key] || translations.en[key] || key;
  };
  
  return { t, language: isClient ? language : undefined };
}