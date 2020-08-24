import i18n from 'i18next';
export class LocaleService {
  private i18n: typeof i18n;
  constructor() {
    this.i18n = i18n.cloneInstance();
  }

  async setLocale(locale = 'en') {
    return await this.i18n.changeLanguage(locale);
  }

  t(key: string, args: any = undefined) {
    return this.i18n.t(key, args);
  }
}
