import {
  ApplicationConfig,
  ErrorHandler,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { languageInterceptor } from './core/interceptors/language-interceptor';
import { errorsInterceptorInterceptor } from './core/interceptors/errors-interceptor-interceptor';
import { GlobalErrorHandlerService } from './core/services/global-error-handler.service';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled',
      }),
    ),
    provideHttpClient(
      withInterceptors([languageInterceptor, authInterceptor, errorsInterceptorInterceptor]),
    ),
    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
        useHttpBackend: true,
        failOnError: true,
      }),
      fallbackLang: 'ar',
      lang: 'ar',
    }),
    { provide: ErrorHandler, useClass: GlobalErrorHandlerService },
  ],
};
