import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';

// PrimeNG
import { AvatarModule }  from 'primeng/avatar';
import { MenuModule }    from 'primeng/menu';
import { RippleModule }  from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule }   from 'primeng/toast';
import { MenuItem, MessageService } from 'primeng/api';

import { AuthService }        from '../service/auth.service';
import { VentaDrawerService } from '../service/venta.drawer.service';
import { environment }        from '../../environments/environment';

interface CarritoItem {
  id: number; nombre: string; precioVenta: number; cantidad: number; stock: number; stockMinimo?: number;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    AvatarModule, MenuModule, RippleModule, TooltipModule, ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {

  // Sidebar
  sidebarCollapsed  = false;
  mobileSidebarOpen = false;
  stockBajoCount    = 0;
  userName    = '';
  userInitial = '';
  userRol     = '';
  isAdmin     = false;
  pageTitle   = 'Dashboard';
  profileMenu: MenuItem[] = [];

  // ── DRAWER NUEVA VENTA ────────────────────────────────
  drawerVisible  = false;
  pasoActual: 'carrito' | 'pago' | 'recibo' = 'carrito';
  guardando      = false;

  busqueda             = '';
  todosLosProductos:   any[] = [];
  resultadosBusqueda:  any[] = [];

  carrito:      CarritoItem[] = [];
  carritoFinal: CarritoItem[] = [];
  nota          = '';

  tiposPago = [
    { label: 'Efectivo',      value: 'EFECTIVO',     icon: 'pi-money-bill' },
    { label: 'Yape',          value: 'YAPE',          icon: 'pi-mobile' },
    { label: 'Plin',          value: 'PLIN',          icon: 'pi-mobile' },
    { label: 'Transferencia', value: 'TRANSFERENCIA', icon: 'pi-send' },
  ];
  tipoPagoSeleccionado = '';
  montoRecibido        = 0;
  vuelto               = 0;
  billetesRapidos      = [10, 20, 50, 100, 200];
  ventaRegistrada:     any = null;

  private sub!: Subscription;
  private apiVentas    = `${environment.apiUrl}/api/ventas`;
  private apiProductos = `${environment.apiUrl}/api/productos`;

  constructor(
    private authService:       AuthService,
    private ventaDrawerService: VentaDrawerService,
    private router:            Router,
    private http:              HttpClient,
    private messageService:    MessageService,
    private cdr:               ChangeDetectorRef
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
      { label: 'Cerrar sesión', icon: 'pi pi-sign-out', command: () => this.logout() }
    ];

    this.router.events.subscribe(() => { this.pageTitle = this.getPageTitle(); });

    // Escuchar el servicio compartido
    this.sub = this.ventaDrawerService.abrir$.subscribe(() => {
      this.abrirNuevaVenta();
    });

    this.cargarProductos();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  // ── Sidebar ───────────────────────────────────────────
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    localStorage.setItem('sidebar_collapsed', String(this.sidebarCollapsed));
  }

  toggleMobileSidebar(): void {
    this.mobileSidebarOpen = !this.mobileSidebarOpen;
    const shell = document.querySelector('.app-shell');
    this.mobileSidebarOpen ? shell?.classList.add('mobile-open') : shell?.classList.remove('mobile-open');
  }

  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }

  private getPageTitle(): string {
    const titles: Record<string, string> = {
      '/dashboard': 'Dashboard', '/ventas': 'Ventas', '/productos': 'Productos',
      '/categorias': 'Categorías', '/proveedores': 'Proveedores', '/gastos': 'Gastos',
      '/movimientos': 'Movimientos', '/usuarios': 'Usuarios', '/empresas': 'Empresas',
    };
    return titles[this.router.url] ?? 'BodegaPOS';
  }

  // ── DRAWER ────────────────────────────────────────────
  cargarProductos(): void {
    this.http.get<any[]>(`${this.apiProductos}/activos`).subscribe({
      next: (data) => { this.todosLosProductos = data.filter(p => p.stock > 0); this.cdr.markForCheck(); }
    });
  }

  abrirNuevaVenta(): void { this.resetearVenta(); this.drawerVisible = true; this.cdr.markForCheck(); }
  cerrarDrawer(): void    { this.drawerVisible = false; this.resetearVenta(); this.cdr.markForCheck(); }

  resetearVenta(): void {
    this.carrito = []; this.busqueda = ''; this.resultadosBusqueda = []; this.nota = '';
    this.pasoActual = 'carrito'; this.tipoPagoSeleccionado = '';
    this.montoRecibido = 0; this.vuelto = 0; this.ventaRegistrada = null; this.carritoFinal = [];
  }

  buscarProductos(): void {
    const q = this.busqueda.toLowerCase().trim();
    if (!q) { this.resultadosBusqueda = []; this.cdr.markForCheck(); return; }
    this.resultadosBusqueda = this.todosLosProductos.filter(p => p.nombre.toLowerCase().includes(q)).slice(0, 8);
    this.cdr.markForCheck();
  }

  limpiarBusqueda(): void { this.busqueda = ''; this.resultadosBusqueda = []; this.cdr.markForCheck(); }

  agregarAlCarrito(producto: any): void {
    const ex = this.carrito.find(i => i.id === producto.id);
    if (ex) { if (ex.cantidad < producto.stock) ex.cantidad++; }
    else     { this.carrito.push({ id: producto.id, nombre: producto.nombre, precioVenta: producto.precioVenta, cantidad: 1, stock: producto.stock, stockMinimo: producto.stockMinimo }); }
    this.limpiarBusqueda();
    this.cdr.markForCheck();
  }

  incrementar(i: number): void { if (this.carrito[i].cantidad < this.carrito[i].stock) { this.carrito[i].cantidad++; this.cdr.markForCheck(); } }
  decrementar(i: number): void {
    if (this.carrito[i].cantidad > 1) this.carrito[i].cantidad--;
    else this.carrito.splice(i, 1);
    this.cdr.markForCheck();
  }
  quitarDelCarrito(i: number): void { this.carrito.splice(i, 1); this.cdr.markForCheck(); }
  get totalCarrito(): number { return this.carrito.reduce((s, i) => s + i.precioVenta * i.cantidad, 0); }

  irAPagar(): void { this.pasoActual = 'pago'; this.cdr.markForCheck(); }

  seleccionarPago(tipo: string): void {
    this.tipoPagoSeleccionado = tipo;
    this.montoRecibido = tipo !== 'EFECTIVO' ? this.totalCarrito : 0;
    this.vuelto = 0;
    this.cdr.markForCheck();
  }

  calcularVuelto(): void { this.vuelto = this.montoRecibido - this.totalCarrito; this.cdr.markForCheck(); }
  usarBillete(valor: number): void { this.montoRecibido = valor; this.calcularVuelto(); }

  puedeConfirmar(): boolean {
    if (!this.tipoPagoSeleccionado) return false;
    if (this.tipoPagoSeleccionado === 'EFECTIVO') return this.montoRecibido >= this.totalCarrito;
    return true;
  }

  confirmarVenta(): void {
    this.guardando = true;
    const body = {
      tipoPago:      this.tipoPagoSeleccionado,
      montoRecibido: this.tipoPagoSeleccionado === 'EFECTIVO' ? this.montoRecibido : this.totalCarrito,
      vuelto:        this.tipoPagoSeleccionado === 'EFECTIVO' ? Math.max(0, this.vuelto) : 0,
      nota:          this.nota || null,
      detalles:      this.carrito.map(i => ({ productoId: i.id, cantidad: i.cantidad, precioVenta: i.precioVenta }))
    };

    this.http.post<any>(this.apiVentas, body).subscribe({
      next: (venta) => {
        this.guardando = false; this.ventaRegistrada = venta;
        this.carritoFinal = [...this.carrito]; this.pasoActual = 'recibo';
        this.cargarProductos(); this.cdr.markForCheck();
        setTimeout(() => this.imprimirTicket(), 600);
        this.messageService.add({ severity: 'success', detail: 'Venta registrada correctamente', life: 3000 });
      },
      error: (err) => {
        this.guardando = false; this.cdr.markForCheck();
        this.messageService.add({ severity: 'error', detail: err.error?.error || 'Error al registrar venta', life: 3500 });
      }
    });
  }

  imprimirTicket(): void {
    console.log(this.authService.getUser());
    const empresa = this.authService.getUser()?.empresaNombre ?? 'BodegaPOS';
    const v = this.ventaRegistrada; const items = this.carritoFinal;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;width:280px;padding:12px}
    .c{text-align:center}.b{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}
    .row{display:flex;justify-content:space-between;margin:2px 0}.titulo{font-size:15px;font-weight:bold;margin-bottom:2px}
    .item{display:flex;gap:4px;margin:2px 0;font-size:11px}.in{flex:1}.it{min-width:58px;text-align:right}
    .total{font-size:14px;font-weight:bold}</style></head><body>
    <div class="c"><div class="titulo">${empresa}</div><div>${v.numeroVenta}</div>
    <div>${new Date(v.fechaVenta).toLocaleString('es-PE')}</div></div>
    <div class="line"></div>
    ${items.map(i=>`<div class="item"><span class="in">${i.nombre}</span><span>${i.cantidad}x S/${i.precioVenta.toFixed(2)}</span><span class="it">S/${(i.precioVenta*i.cantidad).toFixed(2)}</span></div>`).join('')}
    <div class="line"></div>
    <div class="row total"><span>TOTAL</span><span>S/ ${v.total.toFixed(2)}</span></div>
    ${v.montoRecibido?`<div class="row"><span>Recibido</span><span>S/ ${Number(v.montoRecibido).toFixed(2)}</span></div>`:''}
    ${v.vuelto>0?`<div class="row"><span>Vuelto</span><span>S/ ${Number(v.vuelto).toFixed(2)}</span></div>`:''}
    <div class="line"></div><div class="c">Pago: ${v.tipoPago}</div>
    ${v.nota?`<div class="c">Nota: ${v.nota}</div>`:''}
    <div class="line"></div><div class="c">¡Gracias por su compra!</div></body></html>`;
    const win = window.open('','_blank','width=320,height=500');
    if(win){win.document.write(html);win.document.close();win.focus();setTimeout(()=>{win.print();win.close();},400);}
  }

  nuevaVentaRapida(): void { this.resetearVenta(); this.cdr.markForCheck(); }
}