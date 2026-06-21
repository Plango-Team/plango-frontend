import { Component, signal, inject, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { authStore } from '../auth.store';
import { AccountType, ISignUpRequest } from '../../../core/models/iuser';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth/auth.service';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { ApiErrorService } from '../../../core/services/api-error.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, TranslatePipe],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css', 
})
export class SignupComponent {
  public themeService = inject(ThemeService);
  public readonly store = inject(authStore);
  authService = inject(AuthService)
  private language = inject(LanguageService);
  private apiErrors = inject(ApiErrorService);

  // 4 خطوات: 1=نوع الحساب, 2=الأساسيات, 3=اسم المستخدم, 4=الملف الشخصي
  currentStep = signal(1);
  totalSteps = 4;

  // بيانات الفورم
  accountType = signal<AccountType>('personal');
  fullName = '';
  email = '';
  phoneNumber = '';
  password = '';
  confirmPassword = '';
  username = '';
  city = '';
  bio = '';
  isPrivate = signal(false);

  // حالة الفاليديشن
  step2Errors = signal<Record<string, string>>({});
  step3Errors = signal<Record<string, string>>({});
  fieldError = signal<string>('');

  get usernameValid(): boolean {
    const value = this.username.trim().toLowerCase();
    return /^[a-z0-9_]{3,24}$/.test(value);
  }

  isOrganizationAccount(): boolean {
    return this.accountType() === 'organization';
  }

  setAccountType(type: AccountType) {
    this.accountType.set(type);
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

  validateStep2(): boolean {
    const errors: Record<string, string> = {};

    if (!this.fullName.trim()) {
      errors['fullName'] = this.language.instant('auth.signup.validation.nameRequired');
    }
    if (!this.email.trim()) {
      errors['email'] = this.language.instant('auth.signup.validation.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      errors['email'] = this.language.instant('auth.signup.validation.emailInvalid');
    }
    const phoneValue = this.phoneNumber.trim();
    const phoneRegex = /^\+201[0125]\d{8}$/
    if (!phoneValue) {
      errors['phoneNumber'] = this.language.instant('auth.signup.validation.phoneRequired');
    }else if(!phoneRegex.test(phoneValue)){
      errors['phoneNumber'] = this.language.instant('auth.signup.validation.phoneInvalid');
    }
    const passValue = this.password.trim();
    const confirmPasswordValue = this.confirmPassword.trim();
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,}$/;
    if (!passValue) {
      errors['password'] = this.language.instant('auth.signup.validation.passwordRequired');
    } else if (!passwordRegex.test(passValue)) {
      errors['password'] = this.language.instant('auth.signup.validation.passwordInvalid');
    }
    if (!confirmPasswordValue) {
      errors['confirmPassword'] = this.language.instant(
        'auth.signup.validation.confirmPasswordRequired',
      );
    } else if (confirmPasswordValue !== passValue) {
      errors['confirmPassword'] = this.language.instant(
        'auth.signup.validation.passwordsMismatch',
      );
    }

    this.step2Errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  checkUsername():void{
    const userN = this.username.trim().toLowerCase()
    if(!userN) return
    this.authService.checkUsername(userN).subscribe({
      next : (res) => {
        if(!res.data.isAvailable){
          this.step3Errors.update(errors => ({
          ...errors,
          username : this.language.instant('auth.signup.validation.usernameTaken')
        }))
        }else {
          this.step3Errors.update(errors => ({
          ...errors,
          username : ''
        }))
        this.currentStep.update(s => s+1)
        }
      },
      error : (error) => {
        this.step3Errors.update(errors => ({
          ...errors,
          username : this.apiErrors.message(
            error,
            'حدث خطأ أثناء التحقق من اسم المستخدم.',
            'Could not check username availability.',
          )
        }))
      }
    })
  }

  validateStep3(): boolean {
    const errors: Record<string, string> = {};
    const value = this.username.trim().toLowerCase();

    if (!value) {
      errors['username'] = this.language.instant('auth.signup.validation.usernameRequired');
    } else if (!/^[a-z0-9]{4,30}$/.test(value)) {
      errors['username'] = this.language.instant('auth.signup.validation.usernameInvalid');
    }

    this.step3Errors.set(errors);
    return Object.keys(errors).length === 0;
  }

  nextStep() {
    if (this.currentStep() === 2 && !this.validateStep2()) {
      return;
    }
    if (this.currentStep() === 3) {
      if(!this.validateStep3()) return
      this.checkUsername();
      return
    }

    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
    }
  }

  canContinue(): boolean {
    if (this.currentStep() === 1) return true;
    if (this.currentStep() === 2) {
      return (
        this.fullName.trim().length > 0 &&
        this.email.trim().length > 0 && 
        this.phoneNumber.trim().length > 0 && 
        this.password.trim().length > 0 &&
        this.confirmPassword.trim().length > 0
      );
    }
    if(this.currentStep() === 3) return this.username.trim().length > 0
    return true;
  }

  prevStep() {
    if (this.currentStep() > 1) this.currentStep.update((s) => s - 1);
  }

  submitSignUp() {
    if (!this.validateStep2() || !this.validateStep3()) {
      return;
    }
    const nameParts = this.fullName.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName =
      this.accountType() === 'organization' ? '' : nameParts.slice(1).join(' ') || '';
    const displayName = this.fullName.trim();
    const username = this.username.trim().toLowerCase();

    const signUpData: ISignUpRequest = {
      accountType: this.accountType(),
      firstName,
      lastName,
      displayName,
      username,
      email: this.email,
      phoneNumber: this.phoneNumber,
      password: this.password,
      city: this.city,
      bio: this.bio.trim() || undefined,
      isPrivate: this.isPrivate(),
      organizationName: this.isOrganizationAccount() ? displayName : undefined,
      organizationDescription: this.isOrganizationAccount()
        ? this.bio.trim() || undefined
        : undefined,
      preferences: {
        googleCalendarSync: false,
        notifications: true,
        locationTracking: true,
      },
    };
    this.store.signUp(signUpData);
  }
}
                                               
