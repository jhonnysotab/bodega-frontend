import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent)
  },
  // Rutas protegidas con layout
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
    //   {
    //     path: 'ventas',
    //     loadComponent: () =>
    //       import('./pages/ventas/ventas.component').then(m => m.VentasComponent)
    //   },
    //   {
    //     path: 'productos',
    //     loadComponent: () =>
    //       import('./pages/productos/productos.component').then(m => m.ProductosComponent)
    //   },
    //   {
    //     path: 'categorias',
    //     loadComponent: () =>
    //       import('./pages/categorias/categorias.component').then(m => m.CategoriasComponent)
    //   },
    //   {
    //     path: 'proveedores',
    //     loadComponent: () =>
    //       import('./pages/proveedores/proveedores.component').then(m => m.ProveedoresComponent)
    //   },
    //   {
    //     path: 'gastos',
    //     loadComponent: () =>
    //       import('./pages/gastos/gastos.component').then(m => m.GastosComponent)
    //   },
    //   {
    //     path: 'movimientos',
    //     loadComponent: () =>
    //       import('./pages/movimientos/movimientos.component').then(m => m.MovimientosComponent)
    //   },
    //   {
    //     path: 'usuarios',
    //     loadComponent: () =>
    //       import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent)
    //   },
    //   {
    //     path: 'empresas',
    //     loadComponent: () =>
    //       import('./pages/empresas/empresas.component').then(m => m.EmpresasComponent)
    //   },
    ]
  },
  { path: '**', redirectTo: 'login' }
];