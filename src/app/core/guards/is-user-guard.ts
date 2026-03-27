import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { authStore } from '../../features/auth/auth.store';

export const isUserGuard: CanActivateFn = (route, state) => {
  const store = inject(authStore);
  const router = inject(Router);

  if (store.user()) return true;

  const token = localStorage.getItem('token');
  if (!token) {
    router.navigate(['/auth/login']);
    return false;
  }

  return true;
};
