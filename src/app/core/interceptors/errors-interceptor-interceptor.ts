import { HttpInterceptorFn } from '@angular/common/http';

export const errorsInterceptorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
