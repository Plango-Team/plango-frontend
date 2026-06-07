import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { authStore } from '../../../../auth/auth.store';
import { Router } from '@angular/router';
import { DeleteModalComponent } from "../../components/delete-modal/delete-modal.component";

@Component({
  selector: 'app-settings-page',
  imports: [FormsModule, DeleteModalComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.css',
})
export class SettingsPageComponent {
  showPasswordFields = signal<boolean>(false);
  authService = inject(AuthService);
  authStore = inject(authStore);
  router = inject(Router);
  savePassword = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  email = '';
  name = '';
  phone = '';
  successMessage = signal<string>('');
  errorMessage = signal<string>('');
  isChanging = computed(() => {
    const currentUser = this.authStore.user();
    if (!currentUser) return false;
    return (
      this.email.trim() !== currentUser.email ||
      this.phone.trim() !== currentUser.phone
    );
  })
  showPasswordConf= signal<boolean>(false);


  togglePasswordFields(): void {
    this.showPasswordFields.update(value => !value);
    if(!this.showPasswordFields()) {
      this.clearPasswordFields();
    }
  }

  clearPasswordFields(): void {
    this.currentPassword = '';
    this.newPassword='';
    this.confirmPassword='';
  }

  onSubmit(): void {
    if (this.showPasswordFields()) {
      this.handleChangePassword();
    } 
    if(this.isChanging()) {
      this.showPasswordConf.set(true);
      const currentUser = this.authStore.user();
      if (!currentUser) return;
      if(this.phone.trim() !== currentUser.phone){
        this.handlePhoneAction();
      }
      else if(this.email.trim() !== currentUser.email){
        this.handleChangeEmail();
      }
    }
  }

  handlePhoneverify():void{
    const currentUser = this.authStore.user();
    if (!currentUser) return;
    if(!this.phone.trim()){
      this.errorMessage.set('يرجى إدخال رقم هاتف صالح!');
      return;
    }

    this.authService.sendVerificationPhoneOTP(currentUser.phone).subscribe({
      next:(res) => {
        this.errorMessage.set('')
        this.router.navigate(['/auth/verify-phone'], { queryParams: { phone: currentUser.phone , mode : 'verify_only' } });
      },
      error:(err)=>{
        this.errorMessage.set(err?.error?.message || 'حدث خطأ أثناء إرسال رمز التحقق.');
      }
    })
  }

  handlePhoneAction():void{
    const currentUser = this.authStore.user();
    if (!currentUser) return;
    const cleanNewPhone = this.phone.trim()
    if(cleanNewPhone === currentUser?.phone){
      this.errorMessage.set('هذا رقمك الحالي');
      return;
    }
    if(!this.savePassword){
      this.errorMessage.set('يرجي إدخال كلمة المرور لتأكيد تغيير الرقم')
      return;
    }

    this.authService.requestChangePhone(cleanNewPhone , this.savePassword).subscribe({
      next:() => {
        this.errorMessage.set('')
        this.router.navigate(['/auth/verify-phone'], { queryParams: { phone: cleanNewPhone , newPhone : cleanNewPhone , password:this.savePassword,mode:'confirm_new' } });
      },
      error:(err)=>{
        this.errorMessage.set(err?.error?.message || 'حدث خطأ أثناء إرسال رمز التحقق.');
      }
    });
  }


  private handleChangePassword(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage.set('كلمة المرور الجديدة وتأكيدها غير متطابقين!');
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage.set('يرجى ملء جميع حقول كلمة المرور!');
      return;
    }

    const payload = {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword,
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
  if (!this.savePassword) {
    this.errorMessage.set('يرجى إدخال كلمة المرور الحالية لتأكيد تغيير البريد الإلكتروني');
    return;
  }
  this.authService.requestChangeEmail({
    newEmail: this.email.trim(),
    password: this.savePassword
  }).subscribe({
    next: (res: { message: string }) => {
      this.successMessage.set('تم إرسال رابط التأكيد إلى بريدك الإلكتروني الجديد.');
      this.savePassword='';
    },
    error: (err: import('@angular/common/http').HttpErrorResponse) => {
      this.errorMessage.set(err.error?.message || 'فشل طلب تغيير البريد الإلكتروني.');
    }
  });
}
}
