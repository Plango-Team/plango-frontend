import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const isUserGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const isLoggedIn = true;

  if (!isLoggedIn) {
    router.navigate(['/auth/login']);
    return false;
  }
  return isLoggedIn;
};
