import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { authStore } from '../../features/auth/auth.store';

export const isOrganizationGuard: CanActivateFn = () => {
  const store = inject(authStore);
  const router = inject(Router);
  const user = store.user();

  if (user?.role === 'admin') {
    return router.parseUrl('/admin');
  }

  if (user?.role === 'org') {
    return true;
  }

  if (user) {
    return router.parseUrl('/user');
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return router.parseUrl('/auth/login');
  }

  return true;
};
