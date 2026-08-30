import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../service/auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.getUser();

  if (user?.rol === 'ADMIN' || user?.rol === 'PROGRAMADOR') return true;

  // Si es cajero, redirige al dashboard
  router.navigate(['/dashboard']);
  return false;
};
