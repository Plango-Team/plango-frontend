import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const isApiRequest = req.url.startsWith(environment.apiUrl);

  let clonedRequest = req;
  if (isApiRequest) {
    clonedRequest = req.clone({
      withCredentials: true,
      ...(token ? {
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      } : {}),
    });
  } else if (token) {
    clonedRequest = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(clonedRequest);
};
