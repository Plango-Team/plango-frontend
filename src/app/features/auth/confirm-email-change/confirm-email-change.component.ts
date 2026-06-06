import { Component, inject } from '@angular/core';
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

  ngOnInit(): void {
    // لقط التوكن من الـ URL
    const token = this.route.snapshot.queryParamMap.get('token');

    if (token) {
      this.authService.confirmEmailChange(token).subscribe({
        next: (res:{message:string}) => {
          this.router.navigate(['/auth/login']); 
        },
        error: (err) => {
          alert('رابط التأكيد غير صالح أو منتهي الصلاحية.');
        }
      });
    }
  }

  goToLogin() {
    this.router.navigate(['/auth/login']);
  }
}
