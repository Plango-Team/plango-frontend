import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

  currentStep = signal<1 | 2 | 3 | 4 | 5>(1);
  verifyMethod = ''

  email = '';
  phone = '';
  otpDigits = signal<string[]>(['', '', '', '', '', '']);
  newPassword = '';
  confirmPassword = '';

  // أخطاء الخطوة الحالية
  fieldError = signal<string>('');

  get otpCode(): string {
    return this.otpDigits().join('');
  }

  // ─────── الخطوة 1: إرسال الإيميل ───────
  authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  token = signal<string | null>(null);
  successMessageLocal = signal<string | null>(null);

  constructor() {
    const queryToken = this.route.snapshot.queryParams['token'] as string | undefined;
    const paramToken = this.route.snapshot.params['token'] as string | undefined;
    const tokenValue = queryToken || paramToken || null;
    this.token.set(tokenValue);
    console.log('Extracted Token:', tokenValue);
    if (tokenValue) {
      this.currentStep.set(4);
    }
  }


  chooseVerifyMethod(method: 'email' | 'phone') {
    this.verifyMethod = method;
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
    this.fieldError.set('');
    this.store.clearError();
    this.successMessageLocal.set(null);

    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: (res: any) => {
        // prefer backend message
        const message = res?.message ?? (res?.data?.message) ?? 'تم إرسال كود التحقق إلى بريدك الإلكتروني.';
        this.successMessageLocal.set(message);
        this.currentStep.set(3);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'فشل إرسال الطلب.';
        this.store.clearError();
        this.fieldError.set(msg);
      },
    });
  }

  submitPhone() {
  if (!this.phone.trim()) {
    this.fieldError.set('يرجى إدخال رقم الهاتف');
    return;
  }
  
  if (!/^\+?[1-9]\d{1,14}$/.test(this.phone.trim())) {
    this.fieldError.set('تنسيق رقم الهاتف غير صحيح (مثال: 201001234567+)');
    return;
  }

  this.fieldError.set('');
  this.store.clearError();
  this.successMessageLocal.set(null);

  this.authService.requestResetOtp(this.phone).subscribe({
    next: (res: any) => {
      const message = res?.message ?? res?.data?.message ?? 'تم إرسال كود التحقق (OTP) إلى حساب الواتساب الخاص بك.';
      this.successMessageLocal.set(message);
      
      this.currentStep.set(3); 
    },
    error: (err) => {
      const msg = err?.error?.message ?? err?.message ?? 'فشل إرسال كود التحقق.';
      this.store.clearError();
      this.fieldError.set(msg);
    },
  });
}

  // ─────── التعامل مع OTP Input ───────
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

    // الانتقال للخانة التالية
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
      // Focus last input
      const inputs = (event.target as HTMLInputElement).parentElement?.querySelectorAll('input');
      (inputs?.[5] as HTMLInputElement)?.focus();
    }
  }

  // ─────── الخطوة 2: التحقق من OTP ───────
  verifyOtp() {
    if (this.otpCode.length !== 6) {
      this.fieldError.set('يرجى إدخال كود التحقق كاملاً (6 أرقام)');
      return;
    }
    this.fieldError.set('');
    this.store.clearError();

    const checkInterval = setInterval(() => {
      if (this.store.successMessage()) {
        this.currentStep.set(5);
        this.store.clearSuccess();
        clearInterval(checkInterval);
      }
      if (this.store.error()) {
        clearInterval(checkInterval);
      }
    }, 100);
  }

  // ─────── الخطوة 3: كلمة مرور جديدة ───────
  resetPassword() {
    if (!this.newPassword.trim()) {
      this.fieldError.set('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (this.newPassword.length < 6) {
      this.fieldError.set('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.fieldError.set('كلمة المرور غير متطابقة');
      return;
    }
    this.fieldError.set('');
    this.store.clearError();

    const tokenValue = this.token() ?? '';
    console.log('Submitting reset password with token:', tokenValue);

    if (tokenValue) {
      this.authService
        .resetPasswordWithToken({
          token: tokenValue,
          newPassword: this.newPassword,
          confirmPassword: this.confirmPassword,
        })
        .subscribe({
          next: () => {
            this.currentStep.set(5);
          },
          error: (err) => {
            const msg = err?.error?.message ?? err?.message ?? 'فشل إعادة تعيين كلمة المرور.';
            this.store.clearError();
            this.fieldError.set(msg);
          },
        });
      return;
    }

    this.store.resetPassword({
      email: this.email,
      otp: this.otpCode,
      newPassword: this.newPassword,
    });

    const checkInterval = setInterval(() => {
      if (this.store.successMessage()) {
        this.currentStep.set(5);
        clearInterval(checkInterval);
      }
      if (this.store.error()) {
        clearInterval(checkInterval);
      }
    }, 100);
  }

  resetPasswordOtp() {
    if (!this.newPassword.trim()) {
      this.fieldError.set('يرجى إدخال كلمة المرور الجديدة');
      return;
    }
    if (this.newPassword.length < 6) {
      this.fieldError.set('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.fieldError.set('كلمة المرور غير متطابقة');
      return;
    }
     if (this.otpCode.length !== 6) {
      this.fieldError.set('يرجى إدخال كود التحقق كاملاً (6 أرقام)');
      return;
    }
    this.fieldError.set('');
    this.store.clearError();

      if(this.otpCode){
        this.authService.resetPasswordWithOtp({
          phone: this.phone,
          otp: this.otpCode,
          newPassword: this.newPassword,
          confirmPassword: this.confirmPassword,
        })
        .subscribe({
          next: () => {
            this.currentStep.set(5);
          },
          error: (err) => {
            const msg = err?.error?.message ?? err?.message ?? 'فشل إعادة تعيين كلمة المرور.';
            this.store.clearError();
            this.fieldError.set(msg);
          },
        });
      return;
      }
  }

  // ─────── إعادة إرسال OTP ───────
  // resendOtp() {
  //   this.otpDigits.set(['', '', '', '', '', '']);
  //   this.store.clearError();
  //   this.store.forgotPassword({ email: this.email });
  // }
}
