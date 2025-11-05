import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        variant={i18n.language === 'fr' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => changeLanguage('fr')}
      >
        FR
      </Button>
      <Button
        variant={i18n.language === 'en' ? 'secondary' : 'ghost'}
        size="sm"
        onClick={() => changeLanguage('en')}
      >
        EN
      </Button>
      <Globe className="h-5 w-5 text-gray-500" />
    </div>
  );
};

export default LanguageSwitcher;
