import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/services/auth.service';

const AUTH_API_PREFIX = `${environment.apiBaseUrl}/v1/auth`;

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);

  const isAuthApiCall = req.url.startsWith(AUTH_API_PREFIX);
  const token = authService.getToken();

  const request = !isAuthApiCall && token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    })
    : req;

  return next(request);
};
