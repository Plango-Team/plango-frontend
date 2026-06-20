import { effect, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  readonly isDark = signal(this.resolveInitialTheme());

  constructor() {
    effect(() => {
      const isDarkActive = this.isDark();
      document.documentElement.classList.toggle('dark', isDarkActive);
      document.documentElement.style.colorScheme = isDarkActive ? 'dark' : 'light';
      document
        .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
        ?.setAttribute('content', isDarkActive ? '#141414' : '#fffaf9');

      try {
        localStorage.setItem('plango-theme', isDarkActive ? 'dark' : 'light');
      } catch {
        // Theme still works when storage is unavailable.
      }
    });
  }

  toggleTheme() {
    this.isDark.update((v) => !v);
  }

  private resolveInitialTheme(): boolean {
    try {
      const savedTheme = localStorage.getItem('plango-theme');
      if (savedTheme === 'dark') return true;
      if (savedTheme === 'light') return false;
    } catch {
      // Fall through to the system preference.
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
