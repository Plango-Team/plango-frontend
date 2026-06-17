import { HttpInterceptorFn } from '@angular/common/http';

export const cacheInterceptorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req);
};
