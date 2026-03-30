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
    path: '**',
    redirectTo: 'login',
  },
];
