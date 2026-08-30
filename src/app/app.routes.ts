import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'ventas',
        canActivate: [adminGuard], // ❌ cajero no puede
        loadComponent: () =>
          import('./pages/ventas/ventas.component').then((m) => m.VentasComponent),
      },
      {
        path: 'productos', // ✅ cajero puede
        loadComponent: () =>
          import('./pages/productos/productos.component').then((m) => m.ProductosComponent),
      },
      {
        path: 'categorias', // ✅ cajero puede
        loadComponent: () =>
          import('./pages/categorias/categorias.component').then((m) => m.CategoriasComponent),
      },
      {
        path: 'proveedores',
        canActivate: [adminGuard], // ❌ cajero no puede
        loadComponent: () =>
          import('./pages/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
      },
      {
        path: 'gastos',
        canActivate: [adminGuard], // ❌ cajero no puede
        loadComponent: () =>
          import('./pages/gastos/gastos.component').then((m) => m.GastosComponent),
      },
      {
        path: 'movimientos',
        canActivate: [adminGuard], // ❌ cajero no puede
        loadComponent: () =>
          import('./pages/movimientos/movimientos.component').then((m) => m.MovimientosComponent),
      },
      {
        path: 'usuarios',
        canActivate: [adminGuard], // ❌ cajero no puede
        loadComponent: () =>
          import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
      },
      {
        path: 'empresas',
        canActivate: [adminGuard], // ❌ cajero no puede
        loadComponent: () =>
          import('./pages/empresas/empresas.component').then((m) => m.EmpresasComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
