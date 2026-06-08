import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { IconComponent } from "../../../shared/components/icon/icon.component";
import { authStore } from '../auth.store';
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-phone-verify',
  imports: [IconComponent, FormsModule],
  templateUrl: './phone-verify.component.html',
  styleUrl: './phone-verify.component.css',
})
export class PhoneVerifyComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  store = inject(authStore);
  code: string | number = ''
  phone = signal<string>('');
newPhone = signal<string>('');
password = signal<string>('');
mode = signal<string>('confirm_new'); 
err = signal<string>('');

  ngOnInit(): void {
    const snapshot = this.route.snapshot.queryParams;
    this.phone.set(snapshot['phone'] || '');
    this.newPhone.set(snapshot['newPhone'] || '')
    this.password.set(snapshot['password'] || '')
    this.mode.set(snapshot['mode'] || 'confirm_new')
  }
  onConfirmOTP(): void {
    const codeValue = String(this.code ?? '').trim() 
    if(!codeValue)
      return;
    if(this.mode() === 'verify_only'){
      this.authService.verifyPhone(this.phone(), codeValue).subscribe({
      next: (res) => {
        this.store.updateCurrentUser({isPhoneVerified:true})
        this.router.navigate(['/user/settings'])
      },
      error: (err) => {
        this.err.set(err?.error?.message || 'كود التحقق غير صحيح، حاول مرة أخرى.');
      }
    });
    }
    else if(this.mode() === 'confirm_new'){
      this.authService.confirmPhoneChange(codeValue).subscribe({
        next:(res) => {
          this.store.updateCurrentUser({phone:this.phone(),isPhoneVerified : true})
          this.router.navigate(['/user/settings'])
        },
        error:(err) => {
          this.err.set(err?.error?.message || 'كود تأكيد الرقم الجديد غير صحيح ، حاول مرة أخري')
        }
      })
    }
  }

}
