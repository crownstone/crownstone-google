import { locales } from './../locales/index';
import i18n from 'i18next';

export const initI18N = async () => {
  await i18n.init({
    lng: 'en',
    debug: true,
    resources: locales,
    fallbackLng: 'en',
  });
};
