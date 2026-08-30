import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { environment } from '../../../environments/environment';
import { ReportColumn, exportToExcel, exportToPdf } from '../../shared/report-export.util';

type Tab = 'gastos' | 'caja' | 'inventario';

@Component({
  selector: 'app-reportes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, ToastModule],
  providers: [MessageService],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss'],
})
export class ReportesComponent implements OnInit {
  tabActivo: Tab = 'gastos';

  desde = this.primerDiaDelMes();
  hasta = this.hoy();

  loading = false;

  // Gastos
  gastos: any[] = [];
  totalGastos = 0;

  // Caja
  cajas: any[] = [];
  totalDiferenciaCaja = 0;
  cajasConDiferencia = 0;

  // Inventario
  movimientos: any[] = [];
  movimientosFiltrados: any[] = [];
  stockBajo: any[] = [];
  cantIngresos = 0;
  cantAjustes = 0;
  cantVentas = 0;

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.cargarTodo();
  }

  cambiarTab(tab: Tab): void {
    this.tabActivo = tab;
    this.cdr.markForCheck();
  }

  aplicarFiltro(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.loading = true;
    this.cargarGastos();
    this.cargarCajas();
    this.cargarInventario();
  }

  // ── GASTOS ────────────────────────────────────────────
  cargarGastos(): void {
    this.http
      .get<any[]>(`${this.apiUrl}/api/gastos/por-fecha?desde=${this.desde}&hasta=${this.hasta}`)
      .subscribe({
        next: (data) => {
          this.gastos = data;
          this.totalGastos = data.reduce((s, g) => s + g.monto, 0);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  // ── CAJA ──────────────────────────────────────────────
  cargarCajas(): void {
    this.http.get<any[]>(`${this.apiUrl}/api/caja`).subscribe({
      next: (data) => {
        const desdeD = new Date(this.desde);
        const hastaD = new Date(this.hasta);
        hastaD.setHours(23, 59, 59, 999);

        this.cajas = data.filter((c) => {
          const f = new Date(c.fechaApertura);
          return f >= desdeD && f <= hastaD;
        });
        this.totalDiferenciaCaja = this.cajas.reduce((s, c) => s + (c.diferencia || 0), 0);
        this.cajasConDiferencia = this.cajas.filter((c) => c.diferencia && c.diferencia !== 0).length;
        this.cdr.markForCheck();
      },
    });
  }

  // ── INVENTARIO ────────────────────────────────────────
  cargarInventario(): void {
    this.http.get<any[]>(`${this.apiUrl}/api/movimientos-stock`).subscribe({
      next: (data) => {
        const desdeD = new Date(this.desde);
        const hastaD = new Date(this.hasta);
        hastaD.setHours(23, 59, 59, 999);

        this.movimientos = data;
        this.movimientosFiltrados = data.filter((m) => {
          const f = new Date(m.fecha);
          return f >= desdeD && f <= hastaD;
        });
        this.cantIngresos = this.movimientosFiltrados.filter((m) => m.tipoMovimiento === 'INGRESO').length;
        this.cantAjustes = this.movimientosFiltrados.filter((m) => m.tipoMovimiento === 'AJUSTE').length;
        this.cantVentas = this.movimientosFiltrados.filter((m) => m.tipoMovimiento === 'VENTA').length;
        this.cdr.markForCheck();
      },
    });

    this.http.get<any[]>(`${this.apiUrl}/api/productos/stock-bajo`).subscribe({
      next: (data) => {
        this.stockBajo = data;
        this.cdr.markForCheck();
      },
    });
  }

  // ── EXPORTAR ──────────────────────────────────────────
  exportarGastos(formato: 'excel' | 'pdf'): void {
    const columns: ReportColumn[] = [
      { header: 'Fecha', key: 'fecha' },
      { header: 'Descripción', key: 'descripcion' },
      { header: 'Monto (S/)', key: 'monto', format: (v) => Number(v).toFixed(2) },
      { header: 'Usuario', key: 'usuarioNombre' },
    ];
    const nombre = `gastos_${this.desde}_${this.hasta}`;
    const subtitulo = `Del ${this.desde} al ${this.hasta} — Total: S/ ${this.totalGastos.toFixed(2)}`;

    if (formato === 'excel') {
      exportToExcel(nombre, 'Gastos', this.gastos, columns);
    } else {
      exportToPdf(nombre, 'Reporte de gastos', this.gastos, columns, subtitulo);
    }
    this.toast('success', 'Reporte de gastos exportado');
  }

  exportarCajas(formato: 'excel' | 'pdf'): void {
    const columns: ReportColumn[] = [
      { header: 'Apertura', key: 'fechaApertura', format: (v) => (v ? new Date(v).toLocaleString('es-PE') : '') },
      { header: 'Cierre', key: 'fechaCierre', format: (v) => (v ? new Date(v).toLocaleString('es-PE') : '—') },
      { header: 'Estado', key: 'estado' },
      { header: 'Cajero', key: 'usuarioAperturaNombre' },
      { header: 'Monto inicial', key: 'montoInicial', format: (v) => Number(v).toFixed(2) },
      { header: 'Esperado', key: 'montoFinalSistema', format: (v) => (v != null ? Number(v).toFixed(2) : '—') },
      { header: 'Contado', key: 'montoFinalDeclarado', format: (v) => (v != null ? Number(v).toFixed(2) : '—') },
      { header: 'Diferencia', key: 'diferencia', format: (v) => (v != null ? Number(v).toFixed(2) : '—') },
    ];
    const nombre = `cajas_${this.desde}_${this.hasta}`;
    const subtitulo = `Del ${this.desde} al ${this.hasta}`;

    if (formato === 'excel') {
      exportToExcel(nombre, 'Cajas', this.cajas, columns);
    } else {
      exportToPdf(nombre, 'Reporte de caja', this.cajas, columns, subtitulo);
    }
    this.toast('success', 'Reporte de caja exportado');
  }

  exportarMovimientos(formato: 'excel' | 'pdf'): void {
    const columns: ReportColumn[] = [
      { header: 'Fecha', key: 'fecha', format: (v) => new Date(v).toLocaleString('es-PE') },
      { header: 'Producto', key: 'productoNombre' },
      { header: 'Tipo', key: 'tipoMovimiento' },
      { header: 'Cantidad', key: 'cantidad' },
      { header: 'Stock anterior', key: 'stockAnterior' },
      { header: 'Stock nuevo', key: 'stockNuevo' },
      { header: 'Usuario', key: 'usuarioNombre' },
    ];
    const nombre = `movimientos_${this.desde}_${this.hasta}`;
    const subtitulo = `Del ${this.desde} al ${this.hasta}`;

    if (formato === 'excel') {
      exportToExcel(nombre, 'Movimientos', this.movimientosFiltrados, columns);
    } else {
      exportToPdf(nombre, 'Reporte de movimientos de stock', this.movimientosFiltrados, columns, subtitulo);
    }
    this.toast('success', 'Reporte de movimientos exportado');
  }

  exportarStockBajo(formato: 'excel' | 'pdf'): void {
    const columns: ReportColumn[] = [
      { header: 'Producto', key: 'nombre' },
      { header: 'Stock actual', key: 'stock' },
      { header: 'Stock mínimo', key: 'stockMinimo' },
    ];
    const nombre = `stock_bajo_${this.hoy()}`;

    if (formato === 'excel') {
      exportToExcel(nombre, 'Stock bajo', this.stockBajo, columns);
    } else {
      exportToPdf(nombre, 'Productos con stock bajo', this.stockBajo, columns, `Al ${this.hoy()}`);
    }
    this.toast('success', 'Reporte de stock bajo exportado');
  }

  // ── HELPERS ───────────────────────────────────────────
  private hoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  private primerDiaDelMes(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, detail, life: 3000 });
  }
}
