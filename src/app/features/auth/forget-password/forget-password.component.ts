import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ThemeService } from '../../../core/services/theme.service';
import { authStore } from '../auth.store';

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

  currentStep = signal<1 | 2 | 3 | 4>(1);

  email = '';
  otpDigits = signal<string[]>(['', '', '', '', '', '']);
  newPassword = '';
  confirmPassword = '';

  // أخطاء الخطوة الحالية
  fieldError = signal<string>('');

  get otpCode(): string {
    return this.otpDigits().join('');
  }

  // ─────── الخطوة 1: إرسال الإيميل ───────
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

    this.store.forgotPassword({ email: this.email });

    // مراقبة النجاح للانتقال للخطوة التالية
    const checkInterval = setInterval(() => {
      if (this.store.successMessage()) {
        this.currentStep.set(2);
        this.store.clearSuccess();
        clearInterval(checkInterval);
      }
      if (this.store.error()) {
        clearInterval(checkInterval);
      }
    }, 100);
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

    this.store.verifyOtp({ email: this.email, otp: this.otpCode });

    const checkInterval = setInterval(() => {
      if (this.store.successMessage()) {
        this.currentStep.set(3);
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

    this.store.resetPassword({
      email: this.email,
      otp: this.otpCode,
      newPassword: this.newPassword,
    });

    const checkInterval = setInterval(() => {
      if (this.store.successMessage()) {
        this.currentStep.set(4);
        clearInterval(checkInterval);
      }
      if (this.store.error()) {
        clearInterval(checkInterval);
      }
    }, 100);
  }

  // ─────── إعادة إرسال OTP ───────
  resendOtp() {
    this.otpDigits.set(['', '', '', '', '', '']);
    this.store.clearError();
    this.store.forgotPassword({ email: this.email });
  }
}
