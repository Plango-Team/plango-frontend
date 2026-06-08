import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { authStore } from '../../../../auth/auth.store';
import { Router } from '@angular/router';
import { ToastService } from '../../../../../shared/services/toast.service';
import { DeleteModalComponent } from '../../components/delete-modal/delete-modal.component';

type PendingChange = 'email' | 'phone' | null;

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, DeleteModalComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent {
  private authService = inject(AuthService);
  authStore = inject(authStore);
  private router = inject(Router);
  private toast = inject(ToastService);

  // ─── Form Fields ────────────────────────────────────
  name = '';
  email = '';
  phone = '';

  // ─── Password Change ────────────────────────────────
  showPasswordSection = signal(false);
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  // ─── Confirmation Flow ──────────────────────────────
  pendingChange = signal<PendingChange>(null);
  confirmationPassword = '';

  // ─── Loading State ──────────────────────────────────
  isSaving = signal(false);

  // ─── Initialize fields from auth user ───────────────
  constructor() {
    effect(() => {
      const user = this.authStore.user();
      if (user) {
        this.name = user.name ?? '';
        this.email = user.email ?? '';
        this.phone = user.phone ?? '';
      }
    });
  }

  // ─── Computed: what changed? ────────────────────────
  nameChanged = computed(() => {
    const user = this.authStore.user();
    return user ? this.name.trim() !== '' && this.name.trim() !== user.name : false;
  });

  emailChanged = computed(() => {
    const user = this.authStore.user();
    return user ? this.email.trim() !== '' && this.email.trim() !== user.email : false;
  });

  phoneChanged = computed(() => {
    const user = this.authStore.user();
    return user ? this.phone.trim() !== '' && this.phone.trim() !== user.phone : false;
  });

  hasChanges = computed(() =>
    this.nameChanged() || this.emailChanged() || this.phoneChanged() || this.showPasswordSection()
  );

  // ─── Toggle Password Section ────────────────────────
  togglePasswordSection() {
    this.showPasswordSection.update(v => !v);
    if (!this.showPasswordSection()) {
      this.currentPassword = '';
      this.newPassword = '';
      this.confirmPassword = '';
    }
  }

  // ─── Main Submit ────────────────────────────────────
  onSubmit() {
    // Handle password change (independent flow)
    if (this.showPasswordSection()) {
      this.handlePasswordChange();
    }

    // Handle name change (no password confirmation needed)
    if (this.nameChanged()) {
      this.handleNameChange();
    }

    // Email change needs password confirmation
    if (this.emailChanged()) {
      this.pendingChange.set('email');
      return; // Wait for password confirmation
    }

    // Phone change needs password confirmation
    if (this.phoneChanged()) {
      this.pendingChange.set('phone');
      return; // Wait for password confirmation
    }
  }

  // ─── Confirm Sensitive Change (email/phone) ─────────
  confirmSensitiveChange() {
    if (!this.confirmationPassword.trim()) {
      this.toast.error('يرجى إدخال كلمة المرور لتأكيد التغيير');
      return;
    }

    const change = this.pendingChange();
    if (change === 'email') {
      this.handleEmailChange();
    } else if (change === 'phone') {
      this.handlePhoneChange();
    }
  }

  cancelConfirmation() {
    this.pendingChange.set(null);
    this.confirmationPassword = '';
  }

  // ─── Name Change ────────────────────────────────────
  private handleNameChange() {
    const newName = this.name.trim();
    if (!newName) return;

    this.isSaving.set(true);
    this.authService.changeName(newName).subscribe({
      next: () => {
        this.toast.success('تم تحديث الاسم بنجاح');
        // Update auth store with new name
        const user = this.authStore.user();
        if (user) {
          this.authStore.setAuthSession({ user: { ...user, name: newName }, token: localStorage.getItem('token') || '' });
        }
        this.isSaving.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'فشل تحديث الاسم');
        this.isSaving.set(false);
      },
    });
  }

  // ─── Email Change ───────────────────────────────────
  private handleEmailChange() {
    const newEmail = this.email.trim();
    this.isSaving.set(true);

    this.authService.requestChangeEmail({
      newEmail,
      password: this.confirmationPassword,
    }).subscribe({
      next: () => {
        this.toast.success('تم إرسال رابط التأكيد إلى بريدك الإلكتروني الجديد');
        this.pendingChange.set(null);
        this.confirmationPassword = '';
        this.isSaving.set(false);
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'فشل طلب تغيير البريد الإلكتروني');
        this.isSaving.set(false);
      },
    });
  }

  // ─── Phone Change ───────────────────────────────────
  private handlePhoneChange() {
    const newPhone = this.phone.trim();
    this.isSaving.set(true);

    this.authService.requestChangePhone(newPhone, this.confirmationPassword).subscribe({
      next: () => {
        this.toast.info('تم إرسال رمز التحقق إلى الرقم الجديد');
        this.pendingChange.set(null);
        this.isSaving.set(false);
        this.router.navigate(['/auth/verify-phone'], {
          queryParams: { phone: newPhone, newPhone, password: this.confirmationPassword, mode: 'confirm_new' },
        });
        this.confirmationPassword = '';
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'فشل طلب تغيير رقم الهاتف');
        this.isSaving.set(false);
      },
    });
  }

  // ─── Password Change ────────────────────────────────
  private handlePasswordChange() {
    if (!this.currentPassword || !this.newPassword || !this.confirmPassword) {
      this.toast.error('يرجى ملء جميع حقول كلمة المرور');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toast.error('كلمة المرور الجديدة وتأكيدها غير متطابقين');
      return;
    }
    if (this.newPassword.length < 6) {
      this.toast.error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    this.isSaving.set(true);
    this.authService.changePassword({
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
    }).subscribe({
      next: (res) => {
        this.toast.success(res?.message || 'تم تغيير كلمة المرور بنجاح');
        this.isSaving.set(false);
        this.authStore.logOut();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'فشل تغيير كلمة المرور');
        this.isSaving.set(false);
      },
    });
  }

  // ─── Phone Verify (existing unverified phone) ───────
  handlePhoneVerify() {
    const user = this.authStore.user();
    if (!user?.phone) {
      this.toast.error('لا يوجد رقم هاتف مسجل للتأكيد');
      return;
    }

    this.authService.sendVerificationPhoneOTP(user.phone).subscribe({
      next: () => {
        this.router.navigate(['/auth/verify-phone'], {
          queryParams: { phone: user.phone, mode: 'verify_only' },
        });
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'فشل إرسال رمز التحقق');
      },
    });
  }
}
