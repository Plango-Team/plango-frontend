import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { authStore } from '../auth.store';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { ApiErrorService } from '../../../core/services/api-error.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  template: `
    <section class="auth-callback-page">
      <div class="container mx-auto p-6 text-center">
        <h1 class="text-2xl font-semibold">{{ 'auth.callback.title' | translate }}</h1>

        <p *ngIf="status() === 'loading'" class="mt-4 text-sm text-ink-muted">
          {{ 'auth.callback.loading' | translate }}
        </p>

        <p *ngIf="status() === 'success'" class="mt-4 text-sm text-emerald-600">
          {{ 'auth.callback.success' | translate }}
        </p>

        <p *ngIf="status() === 'error'" class="mt-4 text-sm text-primary-500">
          {{ 'auth.callback.failed' | translate }}: {{ errorMessage() }}
        </p>
      </div>
    </section>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private store = inject(authStore);
  private language = inject(LanguageService);
  private apiErrors = inject(ApiErrorService);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal('');

  ngOnInit(): void {
    const token = this.readTokenFromFragment();
    if (!token) {
      this.status.set('error');
      this.errorMessage.set(this.language.instant('auth.callback.missingSession'));
      return;
    }

    localStorage.setItem('token', token);
    window.history.replaceState({}, document.title, window.location.pathname);

    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.store.setAuthSession({ user, token });
        this.status.set('success');
        void this.router.navigate([this.authService.getHomeRoute(user)]);
      },
      error: (err) => {
        localStorage.removeItem('token');
        this.status.set('error');
        this.errorMessage.set(
          this.apiErrors.message(
            err,
            'حدث خطأ أثناء استرجاع المستخدم.',
            'Could not load the signed-in user.',
          ),
        );
      },
    });
  }

  private readTokenFromFragment(): string | null {
    const fragment = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;

    return new URLSearchParams(fragment).get('token');
  }
}
