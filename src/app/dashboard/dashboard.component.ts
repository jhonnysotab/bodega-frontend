import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// PrimeNG
import { ChartModule } from 'primeng/chart';
import { ButtonModule } from 'primeng/button';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../service/auth.service';
import { environment } from '../../environments/environment';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ChartModule, ButtonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // Estados de carga
  loadingStats = true;
  loadingChart = true;
  loadingVentas = true;
  loadingStock = true;

  // KPIs
  totalVentasHoy = 0;
  cantidadVentasHoy = 0;
  productosStockBajo = 0;
  totalMes = 0;
  totalProductos = 0;
  productosActivos = 0;

  // Listas
  ultimasVentas: any[] = [];
  productosConStockBajo: any[] = [];

  // Fecha
  today = '';
  mesActual = '';

  // Gráfico
  chartData: any = {};
  chartOptions: any = {};

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.today = new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.mesActual = new Date().toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

    this.initChart();
    this.cargarDatos();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` });
  }

  // ── Cargar todos los datos ─────────────────────────────
  cargarDatos(): void {
    this.cargarVentasHoy();
    this.cargarStockBajo();
    this.cargarProductos();
    this.cargarChartVentas();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  // Ventas del día
  cargarVentasHoy(): void {
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0).toISOString();
    const hasta = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate(),
      23,
      59,
      59,
    ).toISOString();

    this.http
      .get<any[]>(`${this.apiUrl}/api/ventas/por-fecha?desde=${desde}&hasta=${hasta}`, {
        headers: this.getHeaders(),
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ventas) => {
          this.cantidadVentasHoy = ventas.length;
          this.totalVentasHoy = ventas.reduce((sum, v) => sum + v.total, 0);
          this.ultimasVentas = ventas.slice(0, 5).reverse();
          this.loadingStats = false;
          this.loadingVentas = false;
        },
        error: () => {
          this.loadingStats = false;
          this.loadingVentas = false;
        },
      });
  }

  // Stock bajo
  cargarStockBajo(): void {
    this.http
      .get<any[]>(`${this.apiUrl}/api/productos/stock-bajo`, { headers: this.getHeaders() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (productos) => {
          this.productosStockBajo = productos.length;
          this.productosConStockBajo = productos.slice(0, 5);
          this.loadingStock = false;
        },
        error: () => {
          this.loadingStock = false;
        },
      });
  }

  // Total productos
  cargarProductos(): void {
    this.http
      .get<any[]>(`${this.apiUrl}/api/productos`, { headers: this.getHeaders() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (productos) => {
          this.totalProductos = productos.length;
          this.productosActivos = productos.filter((p) => p.activo).length;
        },
        error: () => {},
      });
  }

  // Gráfico: ventas últimos 7 días
  cargarChartVentas(): void {
    const labels: string[] = [];
    const calls: any[] = [];
    const totales: number[] = [];

    // Generar fechas de los últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' }));

      const desde = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0).toISOString();
      const hasta = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
      calls.push({ desde, hasta });
    }

    // Hacer todas las llamadas en paralelo
    let completadas = 0;
    calls.forEach((c, i) => {
      this.http
        .get<any[]>(`${this.apiUrl}/api/ventas/por-fecha?desde=${c.desde}&hasta=${c.hasta}`, {
          headers: this.getHeaders(),
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (ventas) => {
            totales[i] = ventas.reduce((sum, v) => sum + v.total, 0);
            completadas++;

            // También calcular total del mes (días del mes actual)
            const hoy = new Date();
            if (new Date(c.desde).getMonth() === hoy.getMonth()) {
              this.totalMes += totales[i];
            }

            if (completadas === 7) {
              setTimeout(() => {
                this.updateChart(labels, totales);
              }, 0);
              this.loadingChart = false;
            }
          },
          error: () => {
            totales[i] = 0;
            completadas++;
            if (completadas === 7) {
              setTimeout(() => {
                this.updateChart(labels, totales);
              }, 0);
              this.loadingChart = false;
            }
          },
        });
    });
  }

  // ── Chart config ──────────────────────────────────────
  initChart(): void {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111518',
          borderColor: '#1a2028',
          borderWidth: 1,
          titleColor: '#eef1f3',
          bodyColor: '#7a8a96',
          padding: 12,
          callbacks: {
            label: (ctx: any) => ` S/ ${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
          ticks: { color: '#3a4a58', font: { family: 'DM Sans', size: 11 } },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
          ticks: {
            color: '#3a4a58',
            font: { family: 'DM Sans', size: 11 },
            callback: (v: any) => `S/ ${v}`,
          },
        },
      },
    };
  }

  updateChart(labels: string[], data: number[]): void {
    this.chartData = {
      labels,
      datasets: [
        {
          label: 'Ventas',
          data,
          borderRadius: 6,
          borderSkipped: false,
          backgroundColor: (ctx: any) => {
            const chart = ctx.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return '#2dbd7a';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(45,189,122,0.85)');
            gradient.addColorStop(1, 'rgba(45,189,122,0.25)');
            return gradient;
          },
          hoverBackgroundColor: '#2dbd7a',
        },
      ],
    };
    this.cdr.detectChanges();
  }

  // ── Helpers ───────────────────────────────────────────
  getTipoPagoIcon(tipo: string): string {
    const icons: Record<string, string> = {
      EFECTIVO: 'pi-money-bill',
      YAPE: 'pi-mobile',
      PLIN: 'pi-mobile',
      TRANSFERENCIA: 'pi-send',
    };
    return icons[tipo] ?? 'pi-credit-card';
  }

  getStockPct(stock: number, minimo: number): number {
    if (minimo === 0) return 0;
    return Math.min((stock / minimo) * 100, 100);
  }
}
