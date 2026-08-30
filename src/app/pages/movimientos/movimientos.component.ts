import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-movimientos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToastModule,
    TooltipModule,
    MessageModule,
  ],
  providers: [MessageService],
  templateUrl: './movimientos.component.html',
  styleUrls: ['./movimientos.component.scss'],
})
export class MovimientosComponent implements OnInit {
  movimientosFull: any[] = [];
  movimientosFiltrados: any[] = [];
  productos: any[] = [];
  proveedores: any[] = [];

  loading = true;
  drawerVisible = false;
  saving = false;
  serverError = '';

  filtroTipo: string | null = null;
  filtroProductoId: number | null = null;

  movForm!: FormGroup;
  productoSeleccionado: any = null;

  private apiMov = `${environment.apiUrl}/api/movimientos-stock`;
  private apiProd = `${environment.apiUrl}/api/productos`;
  private apiProv = `${environment.apiUrl}/api/proveedores/activos`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarMovimientos();
    this.cargarCombos();
  }

  initForm(): void {
    this.movForm = this.fb.group({
      tipoMovimiento: ['INGRESO', Validators.required],
      productoId: [null, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      proveedorId: [null],
      nota: [''],
    });
  }

  hasError(field: string): boolean {
    const c = this.movForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  get esIngreso(): boolean {
    return this.movForm.get('tipoMovimiento')?.value === 'INGRESO';
  }

  get stockResultante(): number {
    if (!this.productoSeleccionado) return 0;
    const cant = Number(this.movForm.get('cantidad')?.value ?? 0);
    return this.esIngreso
      ? this.productoSeleccionado.stock + cant
      : this.productoSeleccionado.stock - cant;
  }

  // ── CARGAR DATOS ─────────────────────────────────────
  cargarMovimientos(): void {
    this.loading = true;
    this.http.get<any[]>(this.apiMov).subscribe({
      next: (data) => {
        this.movimientosFull = data.sort(
          (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
        );
        this.aplicarFiltros();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  cargarCombos(): void {
    this.http.get<any[]>(`${this.apiProd}`).subscribe({
      next: (d) => {
        this.productos = d;
        this.cdr.markForCheck();
      },
    });
    this.http.get<any[]>(this.apiProv).subscribe({
      next: (d) => {
        this.proveedores = d;
        this.cdr.markForCheck();
      },
    });
  }

  // ── FILTROS ───────────────────────────────────────────
  filtrar(tipo: string | null): void {
    this.filtroTipo = tipo;
    this.aplicarFiltros();
    this.cdr.markForCheck();
  }

  aplicarFiltros(): void {
    let result = [...this.movimientosFull];
    if (this.filtroTipo) result = result.filter((m) => m.tipoMovimiento === this.filtroTipo);
    if (this.filtroProductoId)
      result = result.filter((m) => m.productoId === this.filtroProductoId);
    this.movimientosFiltrados = result;
  }

  // ── DRAWER ────────────────────────────────────────────
  abrirDrawer(): void {
    this.serverError = '';
    this.productoSeleccionado = null;
    this.movForm.reset({ tipoMovimiento: 'INGRESO', cantidad: 1 });
    this.drawerVisible = true;
    this.cdr.markForCheck();
  }

  cerrarDrawer(): void {
    this.drawerVisible = false;
    this.movForm.reset();
    this.productoSeleccionado = null;
    this.cdr.markForCheck();
  }

  // Cuando seleccionan producto, guardar referencia para preview
  onProductoChange(event: any): void {
    const id = event.value;
    this.productoSeleccionado = this.productos.find((p) => p.id === id) ?? null;
    this.cdr.markForCheck();
  }

  seleccionarTipo(tipo: string): void {
    this.movForm.patchValue({ tipoMovimiento: tipo });
    if (tipo !== 'INGRESO') this.movForm.patchValue({ proveedorId: null });
    this.cdr.markForCheck();
  }

  incrementarCantidad(): void {
    const actual = Number(this.movForm.get('cantidad')?.value ?? 0);
    this.movForm.patchValue({ cantidad: actual + 1 });
    this.cdr.markForCheck();
  }

  decrementarCantidad(): void {
    const actual = Number(this.movForm.get('cantidad')?.value ?? 1);
    if (actual > 1) this.movForm.patchValue({ cantidad: actual - 1 });
    this.cdr.markForCheck();
  }

  // ── GUARDAR ───────────────────────────────────────────
  guardar(): void {
    this.movForm.markAllAsTouched();
    if (this.movForm.invalid) {
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.serverError = '';

    const val = this.movForm.value;
    const body = {
      productoId: val.productoId,
      proveedorId: val.proveedorId ?? null,
      tipoMovimiento: val.tipoMovimiento,
      cantidad: Number(val.cantidad),
      nota: val.nota || null,
    };

    this.http.post<any>(this.apiMov, body).subscribe({
      next: () => {
        this.saving = false;
        this.cerrarDrawer();
        this.cargarMovimientos();
        this.cargarCombos(); // refresca stocks
        this.toast('success', 'Movimiento registrado correctamente');
      },
      error: (err) => {
        this.saving = false;
        this.serverError = err.error?.error || 'Error al registrar movimiento';
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers visuales ──────────────────────────────────
  getTipoClass(tipo: string): string {
    const map: Record<string, string> = { INGRESO: 'ingreso', AJUSTE: 'ajuste' };
    return map[tipo] ?? 'ajuste';
  }

  getTipoIcon(tipo: string): string {
    const map: Record<string, string> = {
      INGRESO: 'pi-arrow-down-left',
      AJUSTE: 'pi-sliders-h',
    };
    return map[tipo] ?? 'pi-question';
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, detail, life: 3000 });
  }
}
