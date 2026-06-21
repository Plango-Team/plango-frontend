import { TranslatePipe } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { authStore } from '../../../features/auth/auth.store';
import { Profile } from '../../../features/user/social/services/social.service';
import { SocialStore } from '../../../features/user/social/social.store';
import { ToastService } from '../../services/toast.service';
import { LanguageService } from '../../../core/services/language.service';
import { ApiErrorService } from '../../../core/services/api-error.service';

type SensitiveChange = 'email' | 'phone' | null;
type SettingsSection = 'profile' | 'contact' | 'security' | 'danger';

@Component({
  selector: 'app-account-settings',
  imports: [TranslatePipe, CommonModule, FormsModule, RouterLink],
  templateUrl: './account-settings.component.html',
  styleUrl: './account-settings.component.css',
})
export class AccountSettingsComponent {
  readonly organization = input(false);

  readonly authStore = inject(authStore);
  readonly socialStore = inject(SocialStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly language = inject(LanguageService);
  private readonly apiErrors = inject(ApiErrorService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly isOrganization = computed(
    () => this.organization() || this.authStore.user()?.role === 'org',
  );
  readonly settingsRoute = computed(() =>
    this.isOrganization() ? '/organization/settings' : '/user/settings',
  );
  readonly profileRoute = computed(() => {
    const username = this.authStore.user()?.username ?? '';
    return this.isOrganization()
      ? `/organization/profile/${username}`
      : `/user/profile/${username}`;
  });
  readonly followersCount = computed(() => {
    const userId = this.authStore.user()?._id;
    return userId ? this.socialStore.followersOf(userId).length : 0;
  });
  readonly postsCount = computed(() => {
    const userId = this.authStore.user()?._id;
    return userId ? this.socialStore.postsBy(userId).length : 0;
  });

  name = '';
  bio = '';
  location = '';
  isPrivate = false;
  email = '';
  phone = '';

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  confirmationPassword = '';
  deletePassword = '';

  readonly profileSaving = signal(false);
  readonly sensitiveSaving = signal(false);
  readonly passwordSaving = signal(false);
  readonly verificationSending = signal(false);
  readonly deleting = signal(false);
  readonly pendingChange = signal<SensitiveChange>(null);
  readonly pendingEmail = signal('');
  readonly deleteStep = signal<'warning' | 'password'>('warning');
  readonly deleteError = signal('');

  private initialProfile = {
    name: '',
    bio: '',
    location: '',
    isPrivate: false,
  };

  @ViewChild('deleteDialog') private deleteDialog?: ElementRef<HTMLDialogElement>;

  constructor() {
    effect(() => {
      const user = this.authStore.user();
      if (!user) return;

      this.name = user.name ?? '';
      this.bio = user.bio ?? '';
      this.location = user.location ?? '';
      this.isPrivate = user.isPrivate ?? false;
      this.email = user.email ?? '';
      this.phone = user.phone ?? '';
      this.initialProfile = {
        name: this.name,
        bio: this.bio,
        location: this.location,
        isPrivate: this.isPrivate,
      };
    });
  }

  profileChanged(): boolean {
    return (
      this.name.trim() !== this.initialProfile.name ||
      this.bio.trim() !== this.initialProfile.bio ||
      this.location.trim() !== this.initialProfile.location ||
      this.isPrivate !== this.initialProfile.isPrivate
    );
  }

  emailChanged(): boolean {
    const currentEmail = this.authStore.user()?.email ?? '';
    return this.email.trim().toLowerCase() !== currentEmail.toLowerCase();
  }

  phoneChanged(): boolean {
    return this.phone.trim() !== (this.authStore.user()?.phone ?? '');
  }

  resetProfile(): void {
    this.name = this.initialProfile.name;
    this.bio = this.initialProfile.bio;
    this.location = this.initialProfile.location;
    this.isPrivate = this.initialProfile.isPrivate;
  }

  scrollToSection(section: SettingsSection): void {
    this.host.nativeElement
      .querySelector<HTMLElement>(`#${section}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  saveProfile(): void {
    const user = this.authStore.user();
    if (!user || !this.profileChanged()) return;

    const name = this.name.trim();
    if (name.length < 3 || name.length > 80) {
      this.toast.error(this.language.text('الاسم يجب أن يكون بين 3 و80 حرفاً', 'Name must be between 3 and 80 characters'));
      return;
    }

    const bio = this.bio.trim();
    if (bio.length > 120) {
      this.toast.error(this.language.text('النبذة لا يمكن أن تتجاوز 120 حرفاً', 'Bio cannot exceed 120 characters'));
      return;
    }

    const profile: Profile = this.socialStore.myProfile() ?? {
      id: user._id,
      kind: user.role === 'org' ? 'org' : 'user',
      username: user.username,
      displayName: user.name,
      bio: user.bio,
      city: user.location,
      isPrivate: user.isPrivate,
      createdAt: new Date(user.createdAt).getTime(),
    };

    this.profileSaving.set(true);
    this.socialStore.updateProfile(
      {
        ...profile,
        displayName: name,
        bio: bio || undefined,
        city: this.location.trim() || undefined,
        isPrivate: this.isPrivate,
      },
      {
        onSuccess: (saved) => {
          this.name = saved.displayName;
          this.bio = saved.bio ?? '';
          this.location = saved.city ?? '';
          this.isPrivate = saved.isPrivate;
          this.initialProfile = {
            name: this.name,
            bio: this.bio,
            location: this.location,
            isPrivate: this.isPrivate,
          };
          this.profileSaving.set(false);
        },
        onError: () => this.profileSaving.set(false),
      },
    );
  }

  beginSensitiveChange(change: Exclude<SensitiveChange, null>): void {
    if (change === 'email') {
      if (!this.emailChanged()) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
        this.toast.error(this.language.text('أدخل بريداً إلكترونياً صحيحاً', 'Enter a valid email address'));
        return;
      }
    }

    if (change === 'phone') {
      if (!this.phoneChanged()) return;
      if (!/^\+[1-9]\d{6,14}$/.test(this.phone.trim())) {
        this.toast.error(this.language.text('اكتب رقم الهاتف بالصيغة الدولية، مثال: +201001234567', 'Use international phone format, for example +201001234567'));
        return;
      }
    }

    this.confirmationPassword = '';
    this.pendingChange.set(change);
  }

  cancelSensitiveChange(): void {
    this.pendingChange.set(null);
    this.confirmationPassword = '';
  }

  confirmSensitiveChange(): void {
    if (!this.confirmationPassword.trim()) {
      this.toast.error(this.language.text('أدخل كلمة المرور الحالية لتأكيد التغيير', 'Enter your current password to confirm the change'));
      return;
    }

    if (this.pendingChange() === 'email') {
      this.requestEmailChange();
    } else if (this.pendingChange() === 'phone') {
      this.requestPhoneChange();
    }
  }

  verifyCurrentPhone(): void {
    const phone = this.authStore.user()?.phone;
    if (!phone) {
      this.toast.error(this.language.text('لا يوجد رقم هاتف مسجل', 'No phone number is registered'));
      return;
    }

    this.verificationSending.set(true);
    this.authService.sendVerificationPhoneOTP(phone).subscribe({
      next: () => {
        this.verificationSending.set(false);
        this.router.navigate(['/auth/verify-phone'], {
          queryParams: {
            phone,
            mode: 'verify_only',
            returnUrl: this.settingsRoute(),
          },
        });
      },
      error: (error) => {
        this.verificationSending.set(false);
        this.toast.error(
          this.apiErrors.message(error, 'تعذر إرسال رمز التحقق', 'Could not send verification code'),
        );
      },
    });
  }

  resendEmailVerification(): void {
    const email = this.authStore.user()?.email;
    if (!email) return;

    this.verificationSending.set(true);
    this.authService.resendVerification({ email }).subscribe({
      next: (response) => {
        this.verificationSending.set(false);
        this.toast.success(
          response.message || this.language.text('تم إرسال رابط التحقق', 'Verification link sent'),
        );
      },
      error: (error) => {
        this.verificationSending.set(false);
        this.toast.error(
          this.apiErrors.message(error, 'تعذر إرسال رابط التحقق', 'Could not send verification link'),
        );
      },
    });
  }

  changePassword(): void {
    const user = this.authStore.user();
    if (!user || user.provider !== 'local') return;

    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.toast.error(this.language.text('أكمل جميع حقول كلمة المرور', 'Complete all password fields'));
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toast.error(this.language.text('كلمة المرور الجديدة وتأكيدها غير متطابقين', 'New password and confirmation do not match'));
      return;
    }
    if (
      this.newPassword.length < 8 ||
      !/[A-Z]/.test(this.newPassword) ||
      !/[a-z]/.test(this.newPassword) ||
      !/\d/.test(this.newPassword) ||
      !/[@$!%*?&^#]/.test(this.newPassword)
    ) {
      this.toast.error(this.language.text('كلمة المرور الجديدة لا تستوفي شروط الأمان', 'The new password does not meet security requirements'));
      return;
    }

    this.passwordSaving.set(true);
    this.authService
      .changePassword({
        currentPassword: this.currentPassword,
        newPassword: this.newPassword,
        confirmPassword: this.confirmPassword,
      })
      .subscribe({
        next: (response) => {
          this.passwordSaving.set(false);
          this.toast.success(
            response?.message || this.language.text('تم تغيير كلمة المرور', 'Password changed'),
          );
          this.authStore.logOut();
        },
        error: (error) => {
          this.passwordSaving.set(false);
          this.toast.error(
            this.apiErrors.message(error, 'تعذر تغيير كلمة المرور', 'Could not change password'),
          );
        },
      });
  }

  openDeleteDialog(): void {
    this.deleteStep.set('warning');
    this.deletePassword = '';
    this.deleteError.set('');
    this.deleteDialog?.nativeElement.showModal();
  }

  closeDeleteDialog(): void {
    if (this.deleting()) return;
    this.deleteDialog?.nativeElement.close();
  }

  confirmDeleteAccount(): void {
    if (!this.deletePassword.trim()) {
      this.deleteError.set(
        this.language.text(
          'أدخل كلمة المرور الحالية',
          'Enter your current password.',
        ),
      );
      return;
    }

    this.deleting.set(true);
    this.deleteError.set('');
    this.authService.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.deleting.set(false);
        this.deleteDialog?.nativeElement.close();
        this.toast.success(this.language.text('تم حذف الحساب', 'Account deleted'));
        this.authStore.logOut();
      },
      error: (error) => {
        this.deleting.set(false);
        this.deleteError.set(
          this.apiErrors.message(
            error,
            'تعذر حذف الحساب. تحقق من كلمة المرور وحاول مرة أخرى.',
            'Could not delete the account. Check your password and try again.',
          ),
        );
      },
    });
  }

  cooldownText(hours: number | undefined): string {
    if (!hours || hours <= 0) return '';
    if (hours < 1) {
      return this.language.text('متاح خلال أقل من ساعة', 'Available in less than an hour');
    }
    return this.language.text(
      `متاح بعد ${Math.ceil(hours)} ساعة`,
      `Available after ${Math.ceil(hours)} hour(s)`,
    );
  }

  initials(): string {
    const value = this.name.trim() || this.authStore.user()?.name || '';
    return value
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  private requestEmailChange(): void {
    const newEmail = this.email.trim();
    this.sensitiveSaving.set(true);
    this.authService
      .requestChangeEmail({
        newEmail,
        password: this.confirmationPassword,
      })
      .subscribe({
        next: () => {
          this.sensitiveSaving.set(false);
          this.pendingEmail.set(newEmail);
          this.email = this.authStore.user()?.email ?? '';
          this.cancelSensitiveChange();
          this.toast.success(
            this.language.text(
              'أرسلنا رابط التأكيد إلى البريد الجديد',
              'A confirmation link was sent to the new email',
            ),
          );
        },
        error: (error) => {
          this.sensitiveSaving.set(false);
          this.toast.error(
            this.apiErrors.message(
              error,
              'تعذر طلب تغيير البريد الإلكتروني',
              'Could not request an email change',
            ),
          );
        },
      });
  }

  private requestPhoneChange(): void {
    const newPhone = this.phone.trim();
    this.sensitiveSaving.set(true);
    this.authService.requestChangePhone(newPhone, this.confirmationPassword).subscribe({
      next: () => {
        this.sensitiveSaving.set(false);
        this.cancelSensitiveChange();
        this.router.navigate(['/auth/verify-phone'], {
          queryParams: {
            phone: newPhone,
            mode: 'confirm_new',
            returnUrl: this.settingsRoute(),
          },
        });
      },
      error: (error) => {
        this.sensitiveSaving.set(false);
        this.toast.error(
          this.apiErrors.message(
            error,
            'تعذر طلب تغيير رقم الهاتف',
            'Could not request a phone number change',
          ),
        );
      },
    });
  }
}
