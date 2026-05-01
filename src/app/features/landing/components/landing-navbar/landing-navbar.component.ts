import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../../core/services/theme.service';
import { authStore } from '../../../auth/auth.store';

export interface LandingNavLink {
  readonly href: string;
  readonly label: string;
}

@Component({
  selector: 'app-landing-navbar',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-navbar.component.html',
  styleUrl: './landing-navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingNavbarComponent {
  readonly links = input<readonly LandingNavLink[]>([]);
  protected readonly themeService = inject(ThemeService);
  protected readonly store = inject(authStore);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  protected readonly isScrolled = signal(false);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly profileMenuOpen = signal(false);
  protected readonly locale = signal<'ar' | 'en'>('ar');

  constructor() {
    const savedLocale = localStorage.getItem('plango-locale');
    if (savedLocale === 'ar' || savedLocale === 'en') {
      this.locale.set(savedLocale);
    }
    this.onWindowScroll();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.isScrolled.set(window.scrollY > 12);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth >= 768) {
      this.closeMobileMenu();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.profileMenuOpen.set(false);
    }
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((isOpen) => !isOpen);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  toggleProfileMenu(): void {
    this.profileMenuOpen.update((isOpen) => !isOpen);
  }

  closeProfileMenu(): void {
    this.profileMenuOpen.set(false);
  }

  logout(): void {
    this.store.logOut();
    this.closeProfileMenu();
    this.closeMobileMenu();
  }

  dashboardRoute(): string {
    return this.store.user()?.role === 'admin' ? '/admin' : '/user';
  }

  fullName(): string {
    const user = this.store.user();
    if (!user) {
      return '';
    }

    return `${user.firstName} ${user.lastName}`.trim();
  }

  initials(): string {
    const user = this.store.user();
    if (!user) {
      return 'U';
    }

    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    const result = `${first}${last}`.trim();

    return result ? result.toUpperCase() : 'U';
  }

  toggleLocale(): void {
    this.locale.update((current) => {
      const next = current === 'ar' ? 'en' : 'ar';
      localStorage.setItem('plango-locale', next);
      return next;
    });
  }
}
