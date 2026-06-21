import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { authStore } from '../auth.store';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiErrorService } from '../../../core/services/api-error.service';

@Component({
  selector: 'app-confirm-email-change',
  imports: [TranslatePipe],
  templateUrl: './confirm-email-change.component.html',
  styleUrl: './confirm-email-change.component.css',
})
export class ConfirmEmailChangeComponent {
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(authStore);
  private router = inject(Router);
  private authService = inject(AuthService);
  private apiErrors = inject(ApiErrorService);
  readonly token = signal('');
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(token);

    if (!token) {
      this.loading.set(false);
      return;
    }

    this.authService.confirmEmailChange(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.store.logOut();
        this.router.navigate(['/auth/login']);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(
          this.apiErrors.message(
            error,
            'رابط التأكيد غير صحيح أو منتهي الصلاحية.',
            'The confirmation link is invalid or expired.',
          ),
        );
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
