import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex space-x-2">
      <button onClick={() => changeLanguage('en')} disabled={i18n.language === 'en'}>EN</button>
      <button onClick={() => changeLanguage('fr')} disabled={i18n.language === 'fr'}>FR</button>
    </div>
  );
}
