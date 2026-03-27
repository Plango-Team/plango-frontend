import { Component, HostListener, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../../core/services/theme.service';
import { authStore } from '../../../auth/auth.store';

@Component({
  selector: 'app-landing-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './landing-navbar.component.html',
  styleUrl: './landing-navbar.component.css',
})
export class LandingNavbarComponent {
  // حقن السيرفيس - هي المسؤولة عن الـ Dark Mode والـ LocalStorage
  public themeService = inject(ThemeService);
  public readonly authStore = inject(authStore);
  isMenuOpen = signal(false);
  activeFragment = signal<string>('why');

  // تبديل الثيم من خلال السيرفيس
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleMenu() {
    this.isMenuOpen.update((v) => !v);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  logout() {
    this.authStore.logOut();
  }
  // مراقبة السكرول لتغيير اللينك النشط (ScrollSpy)
  @HostListener('window:scroll', [])
  onWindowScroll() {
    // بما إننا CSR مش محتاجين نتشيك على PlatformBrowser
    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + 100; // الـ 100 هي إزاحة النافبار

    sections.forEach((section: any) => {
      const top = section.offsetTop;
      const height = section.offsetHeight;

      if (scrollPosition >= top && scrollPosition < top + height) {
        this.activeFragment.set(section.id);
      }
    });
  }
}
