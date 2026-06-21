import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { authStore } from '../auth.store';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { ApiErrorService } from '../../../core/services/api-error.service';

@Component({
  selector: 'app-phone-verify',
  imports: [IconComponent, FormsModule, TranslatePipe],
  templateUrl: './phone-verify.component.html',
  styleUrl: './phone-verify.component.css',
})
export class PhoneVerifyComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  readonly store = inject(authStore);
  private language = inject(LanguageService);
  private apiErrors = inject(ApiErrorService);
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
      this.err.set(this.language.instant('auth.phoneVerify.invalidCode'));
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
          this.err.set(
            this.apiErrors.message(
              error,
              'رمز التحقق غير صحيح، حاول مرة أخرى.',
              'The verification code is incorrect. Try again.',
            ),
          );
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
          this.err.set(
            this.apiErrors.message(
              error,
              'رمز تأكيد الرقم الجديد غير صحيح، حاول مرة أخرى.',
              'The new phone verification code is incorrect. Try again.',
            ),
          );
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
