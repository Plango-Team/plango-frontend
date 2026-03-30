import { Component, signal, inject, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { authStore } from '../auth.store';
import { ISignUpRequest } from '../../../core/models/iuser';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, CommonModule, IconComponent, FormsModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  public themeService = inject(ThemeService);
  public readonly store = inject(authStore);

  // 4 خطوات: 1=بيانات, 2=موقع/مواعيد, 3=تفضيلات, 4=OTP
  currentStep = signal(1);
  totalSteps = 4;

  // بيانات الفورم
  fullName = '';
  email = '';
  phoneNumber = '';
  password = '';
  city = '';
  selectedDays = signal<string[]>([]);

  // خطوة 3 - التفضيلات
  googleCalendarSync = signal(false);
  notificationsEnabled = signal(true);
  locationTracking = signal(true);

  // خطوة 4 - OTP
  otpDigits = signal<string[]>(['', '', '', '', '', '']);
  otpSent = signal(false);

  // حالة الفاليديشن
  step1Errors = signal<Record<string, string>>({});
  fieldError = signal<string>('');

  get otpCode(): string {
    return this.otpDigits().join('');
  }

  constructor() {
    // مسح الأخطاء عند تغيير الخطوة
    effect(() => {
      this.currentStep();
      this.store.clearError();
      this.fieldError.set('');
    });
  }

  // دالة لتحديد كلاسات دوائر التقدم
  stepCircleClass(step: number): string {
    const base =
      'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold transition-all duration-500 border-2 z-10 text-sm md:text-base ';
    if (step < this.currentStep()) {
      return base + 'bg-primary-500 border-primary-500 text-white';
    } else if (step === this.currentStep()) {
      return (
        base +
        'bg-(--card-bg) border-primary-500 text-primary-500 scale-110 shadow-lg shadow-primary-500/20'
      );
    }
    return base + 'bg-(--card-bg) border-(--border-color) text-(--muted-fg)';
  }

  toggleDay(day: string) {
    this.selectedDays.update((days) => {
      if (day === 'يومياً') {
        return days.includes('يومياً') ? [] : ['يومياً'];
      }
      const filtered = days.filter((d) => d !== 'يومياً');
      if (filtered.includes(day)) {
        return filtered.filter((d) => d !== day);
      }
      return [...filtered, day];
    });
  }

  isDaySelected(day: string): boolean {
    return this.selectedDays().includes(day);
  }

  validateStep1(): boolean {
    const errors: Record<string, string> = {};

    if (!this.fullName.trim()) {
      errors['fullName'] = 'يرجى إدخال الاسم الكامل';
    }
    if (!this.email.trim()) {
      errors['email'] = 'يرجى إدخال البريد الإلكتروني';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors['email'] = 'تنسيق البريد الإلكتروني غير صحيح';
    }
    if (!this.phoneNumber.trim()) {
      errors['phoneNumber'] = 'يرجى إدخال رقم الهاتف';
    }
    if (!this.password.trim()) {
      errors['password'] = 'يرجى إدخال كلمة المرور';
    } else if (this.password.length < 6) {
      errors['password'] = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    }

    this.step1Errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  nextStep() {
    if (this.currentStep() === 1) {
      if (!this.validateStep1()) return;
    }
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);

      // عند الوصول للخطوة 4 → إرسال OTP تلقائياً
      if (this.currentStep() === 4 && !this.otpSent()) {
        this.sendOtp();
      }
    }
  }

  prevStep() {
    if (this.currentStep() > 1) this.currentStep.update((s) => s - 1);
  }

  // ─────── إرسال OTP ───────
  sendOtp() {
    this.store.sendSignUpOtp(this.email);
    this.otpSent.set(true);
  }

  // ─────── إعادة إرسال OTP ───────
  resendOtp() {
    this.otpDigits.set(['', '', '', '', '', '']);
    this.store.clearError();
    this.fieldError.set('');
    this.store.sendSignUpOtp(this.email);
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
      const inputs = (event.target as HTMLInputElement).parentElement?.querySelectorAll('input');
      (inputs?.[5] as HTMLInputElement)?.focus();
    }
  }

  // ─────── التحقق من OTP ثم إنشاء الحساب ───────
  verifyAndSignUp() {
    if (this.otpCode.length !== 6) {
      this.fieldError.set('يرجى إدخال كود التحقق كاملاً (6 أرقام)');
      return;
    }
    this.fieldError.set('');
    this.store.clearError();

    // التحقق من OTP أولاً
    this.store.verifyOtp({ email: this.email, otp: this.otpCode });

    // مراقبة النجاح → إنشاء الحساب
    const checkInterval = setInterval(() => {
      if (this.store.successMessage()) {
        this.store.clearSuccess();
        clearInterval(checkInterval);
        // OTP صحيح → إنشاء الحساب فعلياً
        this.submitSignUp();
      }
      if (this.store.error()) {
        clearInterval(checkInterval);
      }
    }, 100);
  }

  submitSignUp() {
    const nameParts = this.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const signUpData: ISignUpRequest = {
      firstName,
      lastName,
      email: this.email,
      phoneNumber: this.phoneNumber,
      password: this.password,
      city: this.city,
      recurringDays: this.selectedDays(),
      preferences: {
        googleCalendarSync: this.googleCalendarSync(),
        notifications: this.notificationsEnabled(),
        locationTracking: this.locationTracking(),
      },
    };

    this.store.signUp(signUpData);
  }
}
