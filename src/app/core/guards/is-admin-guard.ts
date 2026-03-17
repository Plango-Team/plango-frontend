import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const isAdminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  const isLoggedIn = true;
  const userRole = 'admin';

  if (isLoggedIn && userRole === 'admin') {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};
