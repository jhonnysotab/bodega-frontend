import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Router } from '@angular/router';

// PrimeNG
import { AvatarModule }   from 'primeng/avatar';
import { MenuModule }     from 'primeng/menu';
import { RippleModule }   from 'primeng/ripple';
import { TooltipModule }  from 'primeng/tooltip';
import { MenuItem }       from 'primeng/api';

import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AvatarModule,
    MenuModule,
    RippleModule,
    TooltipModule,
  ],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit {

  sidebarCollapsed  = false;
  mobileSidebarOpen = false;
  stockBajoCount    = 0;

  userName    = '';
  userInitial = '';
  userRol     = '';
  isAdmin     = false;
  pageTitle   = 'Dashboard';

  profileMenu: MenuItem[] = [];

  constructor(
    private authService: AuthService,
    private router:      Router
  ) {}

  ngOnInit(): void {
    const user = this.authService.getUser();
    if (user) {
      this.userName    = user.nombre;
      this.userInitial = user.nombre.charAt(0).toUpperCase();
      this.userRol     = user.rol;
      this.isAdmin     = user.rol === 'ADMIN';
    }

    this.profileMenu = [
      {
        label: 'Mi perfil',
        icon:  'pi pi-user',
        command: () => this.router.navigate(['/perfil'])
      },
      { separator: true },
      {
        label:   'Cerrar sesión',
        icon:    'pi pi-sign-out',
        command: () => this.logout()
      }
    ];

    // Actualizar título según la ruta activa
    this.router.events.subscribe(() => {
      this.pageTitle = this.getPageTitle();
    });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebar_collapsed', String(this.sidebarCollapsed));
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
    // Agregar clase al host para mobile
    const shell = document.querySelector('.app-shell');
    if (this.mobileSidebarOpen) {
      shell?.classList.add('mobile-open');
    } else {
      shell?.classList.remove('mobile-open');
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  private getPageTitle(): string {
    const url = this.router.url;
    const titles: Record<string, string> = {
      '/dashboard':   'Dashboard',
      '/ventas':      'Ventas',
      '/productos':   'Productos',
      '/categorias':  'Categorías',
      '/proveedores': 'Proveedores',
      '/gastos':      'Gastos',
      '/movimientos': 'Movimientos de Stock',
      '/usuarios':    'Usuarios',
      '/empresas':    'Empresas',
    };
    return titles[url] ?? 'BodegaPOS';
  }
}