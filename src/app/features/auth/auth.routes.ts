import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'forget-password',
    loadComponent: () =>
      import('./forget-password/forget-password.component').then((m) => m.ForgetPasswordComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  {
    path: 'verify-phone',
    loadComponent: () =>
      import('./phone-verify/phone-verify.component').then((m) => m.PhoneVerifyComponent),
  },
  {
    path: 'email/confirm-change',
    loadComponent: () =>
      import('./confirm-email-change/confirm-email-change.component').then((m) => m.ConfirmEmailChangeComponent),
  },
  {
    path: 'callback',
    loadComponent: () =>
      import('./auth-callback/auth-callback.component').then((m) => m.AuthCallbackComponent),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
