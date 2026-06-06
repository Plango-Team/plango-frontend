import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { authStore } from '../../features/auth/auth.store';

export const isAdminGuard: CanActivateFn = (route, state) => {
  const store = inject(authStore);
  const router = inject(Router);

  const user = store.user();

  if (user && user.role === 'admin') {
    return true;
  }

  if ((user as any)?.accountType === 'organization') {
    return router.parseUrl('/organization');
  }

  if (user) {
    return router.parseUrl('/user');
  }

  return router.parseUrl('/auth/login');
};
