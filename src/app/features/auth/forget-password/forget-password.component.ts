import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ThemeService } from '../../../core/services/theme.service';
import { authStore } from '../auth.store';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-forget-password',
  standalone: true,
  imports: [RouterLink, FormsModule, IconComponent],
  templateUrl: './forget-password.component.html',
  styleUrl: './forget-password.component.css',
})
export class ForgetPasswordComponent {
  public themeService = inject(ThemeService);
  public readonly store = inject(authStore);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  currentStep = signal<1 | 2 | 3 | 4 | 5>(1);
  verifyMethod: 'email' | 'phone' | '' = '';
  isSubmitting = signal(false);

  email = '';
  phone = '';
  otpDigits = signal<string[]>(['', '', '', '', '', '']);
  newPassword = '';
  confirmPassword = '';

  fieldError = signal<string>('');
  token = signal<string | null>(null);
  successMessageLocal = signal<string | null>(null);

  get otpCode(): string {
    return this.otpDigits().join('');
  }

  constructor() {
    const queryToken = this.route.snapshot.queryParamMap.get('token');
    const paramToken = this.route.snapshot.paramMap.get('token');
    const tokenValue = queryToken || paramToken || null;

    this.token.set(tokenValue);
    if (tokenValue) {
      this.currentStep.set(4);
    }
  }

  chooseVerifyMethod(method: 'email' | 'phone') {
    this.verifyMethod = method;
    this.clearMessages();
    this.currentStep.set(2);
  }

  submitEmail() {
    if (!this.email.trim()) {
      this.fieldError.set('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      this.fieldError.set('تنسيق البريد الإلكتروني غير صحيح');
      return;
    }
    this.clearMessages();
    this.isSubmitting.set(true);

    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: (res: any) => {
        const message =
          res?.message ??
          res?.data?.message ??
          'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.';
        this.successMessageLocal.set(message);
        this.currentStep.set(3);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'فشل إرسال الطلب.';
        this.fieldError.set(msg);
      },
    }).add(() => {
      this.isSubmitting.set(false);
    });
  }

  submitPhone() {
    this.phone = this.phone.trim();
    if (!this.phone) {
      this.fieldError.set('يرجى إدخال رقم الهاتف');
      return;
    }

    if (!/^\+[1-9]\d{6,14}$/.test(this.phone)) {
      this.fieldError.set('أدخل رقم الهاتف بالصيغة الدولية، مثال: +201001234567');
      return;
    }

    this.clearMessages();
    this.isSubmitting.set(true);

    this.authService.requestResetOtp(this.phone).subscribe({
      next: (res: any) => {
        const message =
          res?.message ??
          res?.data?.message ??
          'تم إرسال كود التحقق إلى حساب واتساب المرتبط برقمك.';
        this.successMessageLocal.set(message);
        this.currentStep.set(3);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'فشل إرسال كود التحقق.';
        this.fieldError.set(msg);
      },
    }).add(() => {
      this.isSubmitting.set(false);
    });
  }

  onOtpInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value;

    if (value && !/^\d$/.test(value)) {
      input.value = '';
      return;
    }

    this.otpDigits.update((digits) => {
      const newDigits = [...digits];
      newDigits[index] = value;
      return newDigits;
    });

    if (value && index < 5) {
      const nextInput = input.parentElement?.querySelectorAll('input')[index + 1] as HTMLInputElement;
      nextInput?.focus();
    }
  }

  onOtpKeyDown(event: KeyboardEvent, index: number) {
    const input = event.target as HTMLInputElement;

    if (event.key === 'Backspace' && !input.value && index > 0) {
      const prevInput = input.parentElement?.querySelectorAll('input')[index - 1] as HTMLInputElement;
      prevInput?.focus();
    }
  }

  onOtpPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pastedData = event.clipboardData?.getData('text') || '';
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);

    if (digits.length === 6) {
      this.otpDigits.set(digits.split(''));
      const inputs = (event.target as HTMLInputElement).parentElement?.querySelectorAll('input');
      (inputs?.[5] as HTMLInputElement)?.focus();
    }
  }

  verifyOtp() {
    if (this.otpCode.length !== 6) {
      this.fieldError.set('يرجى إدخال كود التحقق كاملاً (6 أرقام)');
      return;
    }

    this.clearMessages();
    this.currentStep.set(4);
  }

  resetPassword() {
    if (!this.newPassword.trim()) {
      this.fieldError.set('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (this.newPassword.length < 8) {
      this.fieldError.set('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (!/[A-Z]/.test(this.newPassword) || !/[a-z]/.test(this.newPassword)) {
      this.fieldError.set('كلمة المرور يجب أن تحتوي على حرف إنجليزي كبير وصغير');
      return;
    }
    if (!/\d/.test(this.newPassword)) {
      this.fieldError.set('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
      return;
    }
    if (!/[@$!%*?&^#]/.test(this.newPassword)) {
      this.fieldError.set('كلمة المرور يجب أن تحتوي على رمز خاص مثل @ أو #');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.fieldError.set('كلمة المرور غير متطابقة');
      return;
    }

    const tokenValue = this.token() ?? '';
    this.clearMessages();
    this.isSubmitting.set(true);

    if (tokenValue) {
      this.authService
        .resetPasswordWithToken({
          token: tokenValue,
          newPassword: this.newPassword,
          confirmPassword: this.confirmPassword,
        })
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: () => this.completeReset(),
          error: (err) => {
            const msg = err?.error?.message ?? err?.message ?? 'فشل إعادة تعيين كلمة المرور.';
            this.fieldError.set(msg);
          },
        });
      return;
    }

    if (this.verifyMethod !== 'phone' || this.otpCode.length !== 6) {
      this.isSubmitting.set(false);
      this.fieldError.set('رابط أو كود إعادة التعيين غير صالح. ابدأ الطلب مرة أخرى.');
      return;
    }

    this.authService
      .resetPasswordWithOtp({
        phone: this.phone,
        otp: this.otpCode,
        newPassword: this.newPassword,
        confirmPassword: this.confirmPassword,
      })
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.completeReset(),
        error: (err) => {
          const msg = err?.error?.message ?? err?.message ?? 'فشل إعادة تعيين كلمة المرور.';
          this.fieldError.set(msg);
        },
      });
  }

  resendRecovery(): void {
    this.otpDigits.set(['', '', '', '', '', '']);
    if (this.verifyMethod === 'email') {
      this.submitEmail();
      return;
    }

    this.submitPhone();
  }

  private clearMessages(): void {
    this.fieldError.set('');
    this.successMessageLocal.set(null);
    this.store.clearError();
    this.store.clearSuccess();
  }

  private completeReset(): void {
    this.currentStep.set(5);
    this.successMessageLocal.set('تم تغيير كلمة المرور بنجاح.');
    setTimeout(() => {
      void this.router.navigate(['/auth/login'], { replaceUrl: true });
    }, 2000);
  }
}
