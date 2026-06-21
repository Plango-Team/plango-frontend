import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../services/language.service';

export const languageInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.startsWith(environment.apiUrl)) {
    return next(request);
  }

  const language = inject(LanguageService);
  const locale = language.locale();

  return next(
    request.clone({
      setHeaders: {
        'X-Language': locale,
        'Accept-Language': locale,
      },
    }),
  );
};
