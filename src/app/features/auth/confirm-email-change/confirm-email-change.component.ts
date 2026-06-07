import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth/auth.service';
import { authStore } from '../auth.store';

@Component({
  selector: 'app-confirm-email-change',
  imports: [],
  templateUrl: './confirm-email-change.component.html',
  styleUrl: './confirm-email-change.component.css',
})
export class ConfirmEmailChangeComponent {
private route = inject(ActivatedRoute);
store = inject(authStore)
  private router = inject(Router);
  private authService = inject(AuthService);
  loading = signal<boolean>(true)
  errMassege = signal<string>('')

  ngOnInit(): void {
    // لقط التوكن من الـ URL
    const token = this.route.snapshot.queryParams['token'];

    if (token) {
      this.authService.confirmEmailChange(token).subscribe({
        next: (res:{message:string}) => {
          this.loading.set(false)
          this.store.logOut()
          this.router.navigate(['/auth/login']); 
        },
        error: (err) => {
          this.loading.set(false)
          this.errMassege.set(err?.error?.message || 'رابط التأكيد غير صحيح او منتهي الصلاحية')
        }
      });
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
