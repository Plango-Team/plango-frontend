import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { authStore } from '../auth.store';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-phone-verify',
  imports: [IconComponent, FormsModule],
  templateUrl: './phone-verify.component.html',
  styleUrl: './phone-verify.component.css',
})
export class PhoneVerifyComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly store = inject(authStore);
  code: string | number = '';
  phone = signal<string>('');
  mode = signal<string>('confirm_new');
  returnUrl = signal<string>('/user/settings');
  err = signal<string>('');
  isSubmitting = signal(false);

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.phone.set(params.get('phone') ?? '');
    this.mode.set(params.get('mode') ?? 'confirm_new');

    const fallback =
      this.store.user()?.role === 'org' ? '/organization/settings' : '/user/settings';
    const requestedReturnUrl = params.get('returnUrl') ?? fallback;
    this.returnUrl.set(this.safeReturnUrl(requestedReturnUrl, fallback));
  }

  onConfirmOTP(): void {
    const codeValue = String(this.code ?? '').trim();
    if (!/^\d{6}$/.test(codeValue)) {
      this.err.set('أدخل رمز التحقق المكوّن من 6 أرقام.');
      return;
    }

    this.err.set('');
    this.isSubmitting.set(true);

    if (this.mode() === 'verify_only') {
      this.authService.verifyPhone(this.phone(), codeValue).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.store.patchCurrentUser({ isPhoneVerified: true });
          this.router.navigateByUrl(this.returnUrl());
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.err.set(error?.error?.message || 'رمز التحقق غير صحيح، حاول مرة أخرى.');
        },
      });
    } else if (this.mode() === 'confirm_new') {
      this.authService.confirmPhoneChange(codeValue).subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.store.patchCurrentUser({ phone: this.phone(), isPhoneVerified: true });
          this.router.navigateByUrl(this.returnUrl());
        },
        error: (error) => {
          this.isSubmitting.set(false);
          this.err.set(error?.error?.message || 'رمز تأكيد الرقم الجديد غير صحيح، حاول مرة أخرى.');
        },
      });
    }
  }

  private safeReturnUrl(requested: string, fallback: string): string {
    return requested === '/user/settings' || requested === '/organization/settings'
      ? requested
      : fallback;
  }
}
