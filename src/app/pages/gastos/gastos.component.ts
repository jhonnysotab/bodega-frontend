import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG
import { TableModule }         from 'primeng/table';
import { ButtonModule }        from 'primeng/button';
import { InputTextModule }     from 'primeng/inputtext';
import { SelectModule }        from 'primeng/select';
import { DatePickerModule }    from 'primeng/datepicker';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule }       from 'primeng/tooltip';
import { IconFieldModule }     from 'primeng/iconfield';
import { InputIconModule }     from 'primeng/inputicon';
import { MessageModule }       from 'primeng/message';
import { MessageService, ConfirmationService } from 'primeng/api';

import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-gastos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    TableModule, ButtonModule, InputTextModule, SelectModule,
    DatePickerModule, ToastModule, ConfirmDialogModule,
    TooltipModule, IconFieldModule, InputIconModule, MessageModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './gastos.component.html',
  styleUrls:   ['./gastos.component.scss']
})
export class GastosComponent implements OnInit {

  gastosFull:     any[] = [];
  gastosHoy:      any[] = [];
  gastosFiltrados: any[] = [];
  categorias:     any[] = [];
  proveedores:    any[] = [];

  loading         = true;
  drawerVisible   = false;
  editMode        = false;
  saving          = false;
  serverError     = '';
  montoFocus      = false;
  filtroCategoria: number | null = null;

  totalHoy = 0;
  totalMes = 0;

  gastoForm!:  FormGroup;
  gastoEditId: number | null = null;

  // Paleta de colores para íconos por categoríaId
  private colores = [
    { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    { bg: 'rgba(239,68,68,0.12)',  fg: '#ef4444' },
    { bg: 'rgba(168,85,247,0.12)', fg: '#a855f7' },
    { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6' },
    { bg: 'rgba(20,184,166,0.12)', fg: '#14b8a6' },
    { bg: 'rgba(249,115,22,0.12)', fg: '#f97316' },
    { bg: 'rgba(45,189,122,0.12)', fg: '#2dbd7a' },
    { bg: 'rgba(236,72,153,0.12)', fg: '#ec4899' },
  ];

  private apiGastos    = `${environment.apiUrl}/api/gastos`;
  private apiCats      = `${environment.apiUrl}/api/categorias/activas`;
  private apiProvs     = `${environment.apiUrl}/api/proveedores/activos`;

  constructor(
    private fb:                  FormBuilder,
    private http:                HttpClient,
    private messageService:      MessageService,
    private confirmationService: ConfirmationService,
    private cdr:                 ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarCombos();
    this.cargarGastos();
  }

  initForm(): void {
    this.gastoForm = this.fb.group({
      monto:       [null, [Validators.required, Validators.min(0.01)]],
      descripcion: ['',   [Validators.required, Validators.minLength(3)]],
      categoriaId: [null],
      proveedorId: [null],
      fecha:       [new Date()],
      nota:        ['']
    });
  }

  hasError(field: string): boolean {
    const c = this.gastoForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  // ── COMBOS ────────────────────────────────────────────
  cargarCombos(): void {
    this.http.get<any[]>(this.apiCats).subscribe({
      next: (d) => { this.categorias = d; this.cdr.markForCheck(); }
    });
    this.http.get<any[]>(this.apiProvs).subscribe({
      next: (d) => { this.proveedores = d; this.cdr.markForCheck(); }
    });
  }

  // ── LISTAR ────────────────────────────────────────────
  cargarGastos(): void {
    this.loading = true;
    this.http.get<any[]>(this.apiGastos).subscribe({
      next: (data) => {
        this.gastosFull = data;

        const hoy  = new Date();
        const mesA = hoy.getFullYear();
        const mesM = hoy.getMonth();

        this.gastosHoy = data.filter(g => {
          const f = new Date(g.fecha);
          return f.getFullYear() === hoy.getFullYear() &&
                 f.getMonth()    === hoy.getMonth()    &&
                 f.getDate()     === hoy.getDate();
        });

        this.totalHoy = this.gastosHoy.reduce((s, g) => s + g.monto, 0);
        this.totalMes = data.filter(g => {
          const f = new Date(g.fecha);
          return f.getFullYear() === mesA && f.getMonth() === mesM;
        }).reduce((s, g) => s + g.monto, 0);

        this.aplicarFiltro();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); }
    });
  }

  // ── FILTROS ───────────────────────────────────────────
  filtrarCategoria(id: number | null): void {
    this.filtroCategoria = id;
    this.aplicarFiltro();
    this.cdr.markForCheck();
  }

  private aplicarFiltro(): void {
    this.gastosFiltrados = this.filtroCategoria === null
      ? [...this.gastosFull]
      : this.gastosFull.filter(g => g.categoriaId === this.filtroCategoria);
  }

  // ── DRAWER ────────────────────────────────────────────
  abrirDrawer(): void {
    this.editMode   = false;
    this.gastoEditId = null;
    this.serverError = '';
    this.gastoForm.reset({ fecha: new Date() });
    this.drawerVisible = true;
    this.cdr.markForCheck();
    // Focus al monto después de que el drawer abra
    setTimeout(() => {
      const el = document.querySelector('.monto-input input') as HTMLInputElement;
      el?.focus();
    }, 350);
  }

  abrirEditar(g: any): void {
    this.editMode   = true;
    this.gastoEditId = g.id;
    this.serverError = '';
    this.gastoForm.patchValue({
      monto:       g.monto,
      descripcion: g.descripcion,
      categoriaId: g.categoriaId ?? null,
      proveedorId: g.proveedorId ?? null,
      fecha:       new Date(g.fecha),
      nota:        g.nota ?? ''
    });
    this.drawerVisible = true;
    this.cdr.markForCheck();
  }

  cerrarDrawer(): void {
    this.drawerVisible = false;
    this.gastoForm.reset();
    this.cdr.markForCheck();
  }

  // ── GUARDAR ───────────────────────────────────────────
  guardar(): void {
    this.gastoForm.markAllAsTouched();
    if (this.gastoForm.invalid) { this.cdr.markForCheck(); return; }

    this.saving      = true;
    this.serverError = '';

    const val  = this.gastoForm.value;
    const body = {
      monto:       Number(val.monto),
      descripcion: val.descripcion,
      categoriaId: val.categoriaId ?? null,
      proveedorId: val.proveedorId ?? null,
      fecha:       val.fecha instanceof Date
                     ? val.fecha.toISOString().split('T')[0]
                     : val.fecha,
      nota:        val.nota || null
    };

    const req = this.editMode && this.gastoEditId
      ? this.http.put(`${this.apiGastos}/${this.gastoEditId}`, body)
      : this.http.post(this.apiGastos, body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cerrarDrawer();
        this.cargarGastos();
        this.toast('success', this.editMode ? 'Gasto actualizado' : 'Gasto registrado');
      },
      error: (err) => {
        this.saving      = false;
        this.serverError = err.error?.error || 'Error al guardar gasto';
        this.cdr.markForCheck();
      }
    });
  }

  // ── ELIMINAR ──────────────────────────────────────────
  confirmarEliminar(g: any): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el gasto <b>${g.descripcion}</b> de S/ ${g.monto}?`,
      header:  'Confirmar eliminación',
      icon:    'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete(`${this.apiGastos}/${g.id}`).subscribe({
          next: () => { this.cargarGastos(); this.toast('success', 'Gasto eliminado'); },
          error: (err) => this.toast('error', err.error?.error || 'Error al eliminar')
        });
      }
    });
  }

  // ── Color por categoríaId ─────────────────────────────
  getCatColor(id: number): { bg: string; fg: string } {
    if (!id) return { bg: 'rgba(255,255,255,0.06)', fg: '#3a4a58' };
    return this.colores[id % this.colores.length];
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, detail, life: 3000 });
  }
}