import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // السيجنال اللي بيتحكم في حالة الدارك مود
  isDark = signal<boolean>(false);

  constructor() {
    // 1. نشوف هل اليوزر كان مختار ثيم قبل كدة؟
    const savedTheme = localStorage.getItem('plango-theme');

    // 2. لو مفيش، نشوف إعدادات الويندوز/الموبايل بتاعته
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // نحدد الحالة الابتدائية
    const initialDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    this.isDark.set(initialDark);

    // 3. أي تغيير في السيجنال، هيطبق الكلاس ويحفظ في الـ LocalStorage أوتوماتيك
    effect(() => {
      const isDarkActive = this.isDark();
      document.documentElement.classList.toggle('dark', isDarkActive);
      localStorage.setItem('plango-theme', isDarkActive ? 'dark' : 'light');
    });
  }

  // دالة التبديل
  toggleTheme() {
    this.isDark.update((v) => !v);
  }
}
