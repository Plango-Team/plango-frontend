import { Component, effect, inject, signal } from '@angular/core';
import { email, form, minLength, required, FormField, FormRoot } from '@angular/forms/signals';

import { RouterLink } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';
import { authStore } from '../auth.store';
import { ILoginRequest } from '../../../core/models/iuser';

@Component({
  selector: 'app-login',
  imports: [FormField, FormRoot, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  authStore = inject(authStore);
  public themeService = inject(ThemeService);
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
          this.authStore.login(this.loginData());
        },
      },
    },
  );

  togglePassword(): void {
    this.showPassword.update((value) => !value);
  }
}
