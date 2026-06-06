import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { authStore } from '../../../../auth/auth.store';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent {
  showPasswordFields = signal<boolean>(false);
  authService = inject(AuthService);
  authStore = inject(authStore);
  router = inject(Router);
  savePassword = signal<string>('');
  currentPassword = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  email = signal<string>('');
  name = signal<string>('');
  phone = signal<string>('');
  successMessage = signal<string>('');
  errorMessage = signal<string>('');
  isChanging = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) return false;
    return (
      this.email().trim() !== currentUser.email ||
      this.phone().trim() !== currentUser.phone
    );
  })


  togglePasswordFields(): void {
    this.showPasswordFields.update(value => !value);
    if(!this.showPasswordFields()) {
      this.clearPasswordFields();
    }
  }

  clearPasswordFields(): void {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
  }

  onSubmit(): void {
    if (this.showPasswordFields()) {
      this.handleChangePassword();
    } 
    if(this.isChanging()) {
      const currentUser = this.authStore.user();
      if (!currentUser) return;
      if(this.phone().trim() !== currentUser.phone){
        this.handlePhoneAction();
      }
      if(this.email().trim() !== currentUser.email){
        this.handleChangeEmail();
      }
    }
  }

  handlePhoneverify():void{
    if(!this.phone().trim()){
      this.errorMessage.set('يرجى إدخال رقم هاتف صالح!');
      return;
    }

    this.authService.sendVerificationPhoneOTP(this.phone()).subscribe({
      next:(res) => {
        this.router.navigate(['/auth/verify-phone'], { queryParams: { phone: this.phone() } });
      },
      error:(err)=>{
        this.errorMessage.set(err?.error?.message || 'حدث خطأ أثناء إرسال رمز التحقق.');
      }
    })
  };

  handlePhoneAction():void{
      const currentUser = this.authStore.user();
    if(this.phone().trim() !== currentUser?.phone){
      if(!this.savePassword()){
      this.errorMessage.set('يرجى إدخال كلمة المرور الحالية لتأكيد تغيير رقم الهاتف');
      return;
    }
    }
    const cleanPhone = this.phone().trim().replace('+','');

    this.authService.requestChangePhone(cleanPhone, this.savePassword()).subscribe({
      next:(res :any) => {
        this.router.navigate(['/auth/verify-phone'], { queryParams: { phone: cleanPhone } });
      },
      error:(err : any)=>{
        this.errorMessage.set(err?.error?.message || 'حدث خطأ أثناء إرسال رمز التحقق.');
      }
    })
  }


  private handleChangePassword(): void {
    if (this.newPassword() !== this.confirmPassword()) {
      this.errorMessage.set('كلمة المرور الجديدة وتأكيدها غير متطابقين!');
      return;
    }

    if (!this.newPassword() || !this.confirmPassword()) {
      this.errorMessage.set('يرجى ملء جميع حقول كلمة المرور!');
      return;
    }

    const payload = {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
      confirmPassword: this.confirmPassword(),
    };

    this.authService.changePassword(payload).subscribe({
      next: (res) => {
        this.successMessage.set(res.message || 'تم تغيير كلمة المرور بنجاح!');
        this.clearPasswordFields();
        this.showPasswordFields.set(false);
        this.authStore.logOut();
      },
      error: (err) => {
        this.errorMessage.set(err?.error?.message || 'حدث خطأ أثناء تغيير كلمة المرور.');
      }
    });
  }


private handleChangeEmail(): void {
  if (!this.currentPassword()) {
    this.errorMessage.set('يرجى إدخال كلمة المرور الحالية لتأكيد تغيير البريد الإلكتروني');
    return;
  }

  this.authService.requestChangeEmail({
    newEmail: this.email().trim(),
    password: this.savePassword()
  }).subscribe({
    next: (res: { message: string }) => {
      this.successMessage.set('تم إرسال رابط التأكيد إلى بريدك الإلكتروني الجديد.');
      this.savePassword.set('');
    },
    error: (err: import('@angular/common/http').HttpErrorResponse) => {
      this.errorMessage.set(err.error?.message || 'فشل طلب تغيير البريد الإلكتروني.');
    }
  });
}
}
