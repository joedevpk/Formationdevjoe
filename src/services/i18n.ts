import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/locales/fr.json';
import en from '@/locales/en.json';

export const supportedLanguages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
];

const saved = localStorage.getItem('lang');
const initial = saved === 'en' ? 'en' : 'fr';

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: initial,
  fallbackLng: 'fr', // les contenus non traduits restent en français (pas de traduction artificielle)
  interpolation: { escapeValue: false },
});

export default i18n;
