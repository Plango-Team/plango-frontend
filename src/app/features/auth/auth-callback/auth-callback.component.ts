import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { authStore } from '../auth.store';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="auth-callback-page">
      <div class="container mx-auto p-6 text-center">
        <h1 class="text-2xl font-semibold">جارٍ إكمال تسجيل الدخول</h1>

        <p *ngIf="status() === 'loading'" class="mt-4 text-sm text-ink-muted">
          سيتم تحويلك تلقائياً بعد التحقق.
        </p>

        <p *ngIf="status() === 'success'" class="mt-4 text-sm text-emerald-600">
          تم تسجيل الدخول بنجاح. جاري النقل...
        </p>

        <p *ngIf="status() === 'error'" class="mt-4 text-sm text-primary-500">
          فشل تسجيل الدخول: {{ errorMessage() }}
        </p>
      </div>
    </section>
  `,
})
export class AuthCallbackComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private store = inject(authStore);

  status = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal('');

  ngOnInit(): void {
    const token = this.readTokenFromFragment();
    if (token) {
      localStorage.setItem('token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const currentUserRequest = token
      ? this.authService.getCurrentUser()
      : this.authService.getCurrentUserWithCredentials();

    currentUserRequest.subscribe({
      next: (user) => {
        this.store.setAuthSession({ user, token });
        this.status.set('success');
        void this.router.navigate([this.authService.getHomeRoute(user)]);
      },
      error: (err) => {
        localStorage.removeItem('token');
        this.status.set('error');
        this.errorMessage.set(err?.error?.message || 'حدث خطأ أثناء استرجاع المستخدم.');
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
