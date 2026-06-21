import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { authStore } from '../auth.store';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.css'],
})
export class VerifyEmailComponent {
  authStore = inject(authStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  token = signal<string | null>(null);

  constructor() {
    // try both query params and route params to be robust
    const qpToken = (this.route.snapshot.queryParams as any)['token'] as string | undefined;
    const paramToken = (this.route.snapshot.params as any)['token'] as string | undefined;
    const tokenValue = qpToken || paramToken || this.route.snapshot.queryParamMap.get('token');

    this.token.set(tokenValue ?? null);
    if (tokenValue) {
      // trigger verification call via the store (which calls the AuthService)
      this.authStore.verifyEmail(tokenValue);
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
