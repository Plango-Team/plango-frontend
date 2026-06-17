import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { authStore } from '../../features/auth/auth.store';
import { AuthService } from '../services/auth/auth.service';
import { catchError, map, of, tap } from 'rxjs';
import { patchState } from '@ngrx/signals';

export const isUserGuard: CanActivateFn = (route, state) => {
  const store = inject(authStore);
  const router = inject(Router);
  const authService = inject(AuthService);
  const user = store.user();

  return authService.getCurrentUserWithCredentials().pipe(
    map((user) => {
      if (user.role === 'admin') {
      return router.parseUrl('/admin');
    }
    if (user.role === 'org') {
      return router.parseUrl('/organization'); 
    }
    return true;
    }),
    catchError(() => {
      const token = localStorage.getItem('token');
      if (token) {
        return of(true);
      }
      return of(router.parseUrl('/auth/login'));
    })
  );
};
