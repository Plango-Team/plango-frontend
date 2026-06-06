import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { IconComponent } from "../../../shared/components/icon/icon.component";
import { authStore } from '../auth.store';

@Component({
  selector: 'app-phone-verify',
  imports: [IconComponent],
  templateUrl: './phone-verify.component.html',
  styleUrl: './phone-verify.component.css',
})
export class PhoneVerifyComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  store = inject(authStore);

  phone = signal<string>('');
  err = signal<string>('');

  ngOnInit(): void {
    this.phone.set(this.route.snapshot.queryParams['phone'] || '');
  }

  onConfirmOTP(code : string): void {
    this.authService.verifyPhone(this.phone(), code).subscribe({
      next: (res) => {
        this.router.navigate(['/user/settings']); 
      },
      error: (err) => {
        this.err.set(err?.error?.message || 'كود التحقق غير صحيح، حاول مرة أخرى.');
      }
    });
  }

}
