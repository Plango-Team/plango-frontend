import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { ApiErrorService } from '../services/api-error.service';

export const errorsInterceptorInterceptor: HttpInterceptorFn = (req, next) => {
  const errors = inject(ApiErrorService);
  const toast = inject(ToastService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((rawError) => {
      const error = errors.normalize(rawError);
      const isAuthRequest = req.url.includes('/auth/login') || req.url.includes('/auth/register');
      const shouldNotify =
        error.status === 0 ||
        error.status === 429 ||
        error.status >= 500 ||
        (!isAuthRequest && req.method !== 'GET');

      if (shouldNotify) {
        toast.error(errors.title(error), error.message);
      }

      if (errors.isSessionError(error) && !isAuthRequest) {
        localStorage.removeItem('token');
        const currentPath = router.url.split('?')[0];
        if (!currentPath.startsWith('/auth/')) {
          void router.navigate(['/auth/login'], {
            queryParams: { session: 'expired' },
          });
        }
      }

      return throwError(() => error);
    }),
  );
};
