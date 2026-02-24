import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

import { TableModule }  from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule }  from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { VentaDrawerService } from '../../service/venta.drawer.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-ventas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TableModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './ventas.component.html',
  styleUrls:   ['./ventas.component.scss']
})
export class VentasComponent implements OnInit {

  ventasHoy:     any[] = [];
  loading        = true;
  totalDia       = 0;
  ticketPromedio = 0;

  private apiVentas = `${environment.apiUrl}/api/ventas`;

  constructor(
    private http:               HttpClient,
    private ventaDrawerService: VentaDrawerService,
    private messageService:     MessageService,
    private cdr:                ChangeDetectorRef
  ) {}

  ngOnInit(): void { this.cargarVentasHoy(); }

  cargarVentasHoy(): void {
    this.loading = true;
    const hoy    = new Date();
    const desde  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).toISOString();
    const hasta  = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59).toISOString();

    this.http.get<any[]>(`${this.apiVentas}/por-fecha?desde=${desde}&hasta=${hasta}`).subscribe({
      next: (data) => {
        this.ventasHoy      = data.sort((a, b) => new Date(b.fechaVenta).getTime() - new Date(a.fechaVenta).getTime());
        this.totalDia       = data.reduce((s, v) => s + v.total, 0);
        this.ticketPromedio = data.length > 0 ? this.totalDia / data.length : 0;
        this.loading        = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

 
  getPagoIcon(tipo: string): string {
    const map: Record<string, string> = { EFECTIVO: 'pi-money-bill', YAPE: 'pi-mobile', PLIN: 'pi-mobile', TRANSFERENCIA: 'pi-send' };
    return map[tipo] ?? 'pi-credit-card';
  }
}