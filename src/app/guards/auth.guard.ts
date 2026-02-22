import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (route, state) => {

  const router = inject(Router);

  const token = localStorage.getItem('token');

  // ❌ No hay token
  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  // ✅ Validar expiración (simple)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    const exp = payload.exp;
    const now = Math.floor(Date.now() / 1000);

    if (exp < now) {
      localStorage.removeItem('token');
      router.navigate(['/login']);
      return false;
    }

  } catch (e) {
    localStorage.removeItem('token');
    router.navigate(['/login']);
    return false;
  }

  return true;
};
