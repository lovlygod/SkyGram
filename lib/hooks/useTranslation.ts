import { useTheme } from '#/lib/context/theme-context';
import { translations } from '#/lib/i18n/translations';

export function useTranslation() {
  const { language } = useTheme();
  
  const t = (key: keyof typeof translations.en) => {
    const langTranslations = translations[language];
    return langTranslations[key] || translations.en[key] || key;
  };
  
  return { t, language };
}