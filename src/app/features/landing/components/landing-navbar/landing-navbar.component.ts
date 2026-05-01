import { Component, HostListener, signal, inject, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../../core/services/theme.service';
import { authStore } from '../../../auth/auth.store';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-landing-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule ,IconComponent],
  templateUrl: './landing-navbar.component.html',
  styleUrl: './landing-navbar.component.css',
})
export class LandingNavbarComponent {
  public themeService = inject(ThemeService);
  public readonly store = inject(authStore);
  private elementRef = inject(ElementRef);

  isMenuOpen = signal(false);
  isDropdownOpen = signal(false);
  activeFragment = signal<string>('why');
  isScrolled = signal(false);

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  toggleMenu() {
    this.isMenuOpen.update((v) => !v);
    // Toggle body scroll
    if (this.isMenuOpen()) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMenu() {
    this.isMenuOpen.set(false);
    document.body.style.overflow = '';
  }

  toggleDropdown() {
    this.isDropdownOpen.update((v) => !v);
  }

  closeDropdown() {
    this.isDropdownOpen.set(false);
  }

  logout() {
    this.store.logOut();
    this.closeDropdown();
    this.closeMenu();
  }

  // إغلاق الدروب داون عند الضغط خارجه
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled.set(window.scrollY > 20);

    const sections = document.querySelectorAll('section[id]');
    const scrollPosition = window.scrollY + 100;

    sections.forEach((section: Element) => {
      const el = section as HTMLElement;
      const top = el.offsetTop;
      const height = el.offsetHeight;

      if (scrollPosition >= top && scrollPosition < top + height) {
        this.activeFragment.set(el.id);
      }
    });
  }

  // إغلاق القائمة عند تغيير حجم الشاشة
  @HostListener('window:resize', [])
  onResize() {
    if (window.innerWidth >= 768) {
      this.closeMenu();
    }
  }
}
