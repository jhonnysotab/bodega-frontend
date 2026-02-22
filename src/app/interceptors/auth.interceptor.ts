import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../service/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);
  const token       = authService.getToken();

  // Clonar el request y agregar el Bearer token si existe
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {

      switch (error.status) {
        case 401:
          // Token inválido o expirado → cerrar sesión
          authService.logout();
          router.navigate(['/login']);
          break;

        case 403:
          // Sin permisos → volver al dashboard
          router.navigate(['/dashboard']);
          break;

        case 0:
          // Sin conexión al servidor
          console.error('No se pudo conectar con el servidor');
          break;
      }

      return throwError(() => error);
    })
  );
};