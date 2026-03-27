import {
  patchState,
  signalMethod,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { IAuthResponse, IUser } from '../../core/models/iuser';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/services/auth/auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

export type AuthState = {
  user: IUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
};

export const authStore = signalStore(
  {
    providedIn: 'root',
  },
  withState({
    user: null,
    token: null,
    isLoading: false,
    error: null,
  } as AuthState),
  withComputed(({}) => ({})),
  withMethods((authStore, authService = inject(AuthService), router = inject(Router)) => ({
    login: rxMethod<any>(
      pipe(
        tap(() => patchState(authStore, { isLoading: true, error: null })),
        switchMap((credentials) =>
          authService.login(credentials).pipe(
            tap({
              next: (response) => {
                patchState(authStore, {
                  user: response.user,
                  token: response.token,
                  isLoading: false,
                });
                localStorage.setItem('token', response.token);
                router.navigate(['/']); // التوجيه للداشبورد
              },
              error: (err) => {
                // هنا بنخزن رسالة الخطأ اللي جاية من السيرفر أو الموك
                patchState(authStore, {
                  isLoading: false,
                  error: err.message || 'حدث خطأ أثناء تسجيل الدخول',
                });
              },
            }),
          ),
        ),
      ),
    ),
    logOut: signalMethod<void>(() => {
      localStorage.removeItem('token');
      patchState(authStore, { user: null, token: null });
    }),
    initAuth: rxMethod<void>(
      pipe(
        tap(() => patchState(authStore, { isLoading: true })),
        switchMap(() => {
          const token = localStorage.getItem('token');

          if (!token) {
            patchState(authStore, { isLoading: false, user: null });
            return of(null);
          }

          // بننادي السيرفر يتأكد من التوكن ويرجع اليوزر
          return authService.getCurrentUser().pipe(
            tap({
              next: (user) => {
                patchState(authStore, { user, token, isLoading: false });
              },
              error: () => {
                // لو التوكن expired أو السيرفر رفضها
                localStorage.removeItem('token');
                patchState(authStore, { user: null, token: null, isLoading: false });
                router.navigate(['/auth/login']);
              },
            }),
            catchError(() => of(null)),
          );
        }),
      ),
    ),
  })),
);
