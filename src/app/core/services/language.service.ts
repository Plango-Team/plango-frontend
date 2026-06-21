import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLocale = 'ar' | 'en';
export type AppDirection = 'rtl' | 'ltr';
export type TranslationVariables = Record<string, string | number>;

const LOCALE_STORAGE_KEY = 'plango-locale';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly document = inject(DOCUMENT);
  private readonly translate = inject(TranslateService);
  private readonly localeState = signal<AppLocale>(this.readInitialLocale());

  readonly locale = this.localeState.asReadonly();
  readonly isArabic = computed(() => this.localeState() === 'ar');
  readonly direction = computed<AppDirection>(() => (this.isArabic() ? 'rtl' : 'ltr'));
  readonly htmlLanguage = computed(() => (this.isArabic() ? 'ar-EG' : 'en-US'));

  constructor() {
    this.translate.addLangs(['ar', 'en']);
    this.translate.setFallbackLang('ar');

    effect(() => {
      const locale = this.localeState();
      const direction = locale === 'ar' ? 'rtl' : 'ltr';
      const root = this.document.documentElement;

      root.lang = locale;
      root.dir = direction;
      root.dataset['locale'] = locale;
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      this.translate.use(locale);
    });
  }

  setLocale(locale: AppLocale): void {
    this.localeState.set(locale);
  }

  toggleLocale(): void {
    this.localeState.update((locale) => (locale === 'ar' ? 'en' : 'ar'));
  }

  text(arabic: string, english: string, variables: TranslationVariables = {}): string {
    const template = this.isArabic() ? arabic : english;
    return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
      variables[key] === undefined ? match : String(variables[key]),
    );
  }

  instant(key: string, variables: TranslationVariables = {}): string {
    return this.translate.instant(key, variables);
  }

  formatDate(
    value: Date | string | number,
    options: Intl.DateTimeFormatOptions = {},
  ): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat(this.htmlLanguage(), options).format(date);
  }

  formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
    return new Intl.NumberFormat(this.htmlLanguage(), options).format(value);
  }

  private readInitialLocale(): AppLocale {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY);
    return savedLocale === 'en' ? 'en' : 'ar';
  }
}
