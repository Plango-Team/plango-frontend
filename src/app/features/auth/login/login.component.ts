import { Component, effect, inject, signal, OnInit } from '@angular/core';
import { email, form, minLength, required, FormField, FormRoot } from '@angular/forms/signals';
import { firstValueFrom } from 'rxjs';

import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { authStore } from '../auth.store';
import { ILoginRequest } from '../../../core/models/iuser';
import { environment } from '../../../../environments/environment';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { ApiErrorService } from '../../../core/services/api-error.service';

@Component({
  selector: 'app-login',
  imports: [FormField, FormRoot, RouterLink, TranslatePipe],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {
  authStore = inject(authStore);
  public themeService = inject(ThemeService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private language = inject(LanguageService);
  private apiErrors = inject(ApiErrorService);
  showPassword = signal(false);

  private readonly STORAGE_KEY = 'plan_go_login_draft';
  loginData = signal<ILoginRequest>({
    email: JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}').email || '',
    password: '',
  });

  constructor() {
    effect(() => {
      const dataToSave = { email: this.loginData().email };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
    });
    effect(() => {
      if (this.authStore.user()) {
        console.log('Login Success, clearing draft...');
        localStorage.removeItem(this.STORAGE_KEY);
      }
    });
  }

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const currentPath = (this.router.url || window.location.pathname).split('?')[0];

    const onLoginPath = currentPath === '/auth/login';
    const onVerifyPath = currentPath.includes('/verify-email');

    if (token && onLoginPath && !onVerifyPath) {
      this.router.navigate(['/auth/reset-password'], {
        queryParams: { token },
        replaceUrl: true,
      });
    }
  }

  loginForm = form(
    this.loginData,
    (path) => {
      email(path.email);
      required(path.email);
      minLength(path.password, 6);
      required(path.password);
    },
    {
      submission: {
        action: async () => {
          await this.handleLogin();
        },
      },
    },
  );

  signInWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  resendVerification(): void {
    const email = this.loginData().email?.trim();
    if (!email) {
      return;
    }

    this.authStore.resendVerification({ email });
  }

  private async handleLogin(): Promise<void> {
    const credentials = this.loginData();
    const email = credentials.email?.trim();
    const verificationToken = this.route.snapshot.queryParamMap.get('token');

    if (!email || !credentials.password) {
      this.authStore.setError(this.language.instant('auth.login.validation.credentialsRequired'));
      return;
    }

    this.authStore.setLoading(true);
    this.authStore.clearError();
    this.authStore.clearSuccess();

    try {
      const response = await firstValueFrom(this.authService.login(credentials));
      this.authStore.setAuthSession({ user: response.user, token: response.token });
      localStorage.setItem('token', response.token);
      this.router.navigate([this.authService.getHomeRoute(response.user)]);
    } catch (error: unknown) {
      const httpError = this.apiErrors.normalize(error);

      if (httpError.code === 'EMAIL_NOT_VERIFIED') {
        if (verificationToken) {
          try {
            await firstValueFrom(this.authService.verifyEmail(verificationToken));
            this.authStore.setSuccessMessage('Account verified successfully! Please log in now.');
          } catch (verifyError: unknown) {
            this.authStore.setError(
              this.apiErrors.message(
                verifyError,
                'حدث خطأ أثناء التحقق من البريد الإلكتروني.',
                'Email verification failed.',
              ),
            );
          }
        } else {
          this.authStore.setError(httpError.message);
        }

        await this.router.navigate(['/auth/login']);
      } else {
        this.authStore.setError(httpError.message);
      }
    } finally {
      this.authStore.setLoading(false);
    }
  }

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }
}
