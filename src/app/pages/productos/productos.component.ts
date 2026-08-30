import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { MessageModule } from 'primeng/message';
import { MessageService, ConfirmationService } from 'primeng/api';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from '../../service/auth.service';
import { environment } from '../../../environments/environment';
import {
  ProductoImportRow,
  parseProductosExcel,
  descargarPlantillaProductos,
} from '../../shared/producto-import.util';

@Component({
  selector: 'app-productos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './productos.component.html',
  styleUrls: ['./productos.component.scss'],
})
export class ProductosComponent implements OnInit {
  // Listas
  productos: any[] = [];
  productosFull: any[] = []; // copia completa para filtros
  categorias: any[] = [];
  isAdmin = false;
  // Estados
  loading = true;
  dialogVisible = false;
  editMode = false;
  saving = false;
  serverError = '';
  filtroActivo = 'todos';
  countStockBajo = 0;
  productoForm!: FormGroup;
  productoEditId: number | null = null;

  // ── Importación masiva ────────────────────────────────
  importDialogVisible = false;
  importRows: ProductoImportRow[] = [];
  importing = false;
  importProgreso = { hecho: 0, total: 0 };
  importandoImagen = false;
  importImagenError = '';

  // Paleta de colores por categoría
  private colores = [
    { bg: 'rgba(45,189,122,0.12)', fg: '#2dbd7a' },
    { bg: 'rgba(59,130,246,0.12)', fg: '#3b82f6' },
    { bg: 'rgba(245,158,11,0.12)', fg: '#f59e0b' },
    { bg: 'rgba(239,68,68,0.12)', fg: '#ef4444' },
    { bg: 'rgba(168,85,247,0.12)', fg: '#a855f7' },
    { bg: 'rgba(20,184,166,0.12)', fg: '#14b8a6' },
    { bg: 'rgba(249,115,22,0.12)', fg: '#f97316' },
    { bg: 'rgba(236,72,153,0.12)', fg: '#ec4899' },
  ];

  private apiProd = `${environment.apiUrl}/api/productos`;
  private apiCats = `${environment.apiUrl}/api/categorias/activas`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    console.log(this.authService.isAdmin);
    this.initForm();
    this.cargarCategorias();
    this.cargarProductos();
  }

  initForm(): void {
    this.productoForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      codigoBarras: [''],
      // descripcion: [''],
      precioCompra: [null, [Validators.required, Validators.min(0)]],
      precioVenta: [null, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      stockMinimo: [0],
      categoriaId: [null],
    });
  }

  hasError(field: string): boolean {
    const c = this.productoForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  // ── CARGAR CATEGORÍAS ────────────────────────────────
  cargarCategorias(): void {
    this.http.get<any[]>(this.apiCats).subscribe({
      next: (data) => {
        this.categorias = data;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }

  // ── LISTAR ────────────────────────────────────────────
  cargarProductos(): void {
    this.loading = true;
    this.http.get<any[]>(this.apiProd).subscribe({
      next: (data) => {
        this.productosFull = data;
        this.countStockBajo = data.filter(
          (p) => p.stock <= (p.stockMinimo ?? 0) && p.activo,
        ).length;
        this.aplicarFiltro();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast('error', 'Error al cargar productos');
      },
    });
  }

  // ── FILTROS ───────────────────────────────────────────
  filtrar(tipo: string): void {
    this.filtroActivo = tipo;
    this.aplicarFiltro();
    this.cdr.markForCheck();
  }

  private aplicarFiltro(): void {
    switch (this.filtroActivo) {
      case 'stock_bajo':
        this.productos = this.productosFull.filter(
          (p) => p.stock <= (p.stockMinimo ?? 0) && p.activo,
        );
        break;
      case 'inactivos':
        this.productos = this.productosFull.filter((p) => !p.activo);
        break;
      default:
        this.productos = [...this.productosFull];
    }
  }

  // ── DIALOGS ───────────────────────────────────────────
  abrirDialogCrear(): void {
    this.editMode = false;
    this.productoEditId = null;
    this.serverError = '';
    this.productoForm.reset({ stock: 0, stockMinimo: 0, categoriaId: null });
    this.dialogVisible = true;
    this.cdr.markForCheck();
  }

  abrirDialogEditar(p: any): void {
    this.editMode = true;
    this.productoEditId = p.id;
    this.serverError = '';
    this.productoForm.patchValue({
      nombre: p.nombre,
      codigoBarras: p.codigoBarras ?? '',
      // descripcion: p.descripcion,
      precioVenta: p.precioVenta,
      precioCompra: p.precioCompra,
      stock: p.stock,
      stockMinimo: p.stockMinimo ?? 0,
      categoriaId: p.categoriaId ?? null,
    });
    this.dialogVisible = true;
    this.cdr.markForCheck();
  }

  cerrarDialog(): void {
    this.dialogVisible = false;
    this.productoForm.reset();
    this.cdr.markForCheck();
  }

  // ── GUARDAR ───────────────────────────────────────────
  guardar(): void {
    this.productoForm.markAllAsTouched();
    if (this.productoForm.invalid) return;

    this.saving = true;
    this.serverError = '';

    const val = this.productoForm.value;
    const body = {
      nombre: val.nombre,
      codigoBarras: val.codigoBarras || null,
      // descripcion: val.descripcion || null,
      precioCompra: Number(val.precioCompra),
      precioVenta: Number(val.precioVenta),
      stock: Number(val.stock),
      stockMinimo: Number(val.stockMinimo ?? 0),
      categoriaId: val.categoriaId ?? null,
    };

    const req =
      this.editMode && this.productoEditId
        ? this.http.put(`${this.apiProd}/${this.productoEditId}`, body)
        : this.http.post(this.apiProd, body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cerrarDialog();
        this.cargarProductos();
        this.toast('success', this.editMode ? 'Producto actualizado' : 'Producto creado');
      },
      error: (err) => {
        this.saving = false;
        this.serverError = err.error?.error || 'Error al guardar producto';
        this.cdr.markForCheck();
      },
    });
  }

  // ── TOGGLE ESTADO ─────────────────────────────────────
  toggleEstado(p: any): void {
    const nuevo = !p.activo;
    const accion = nuevo ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Deseas ${accion} el producto <b>${p.nombre}</b>?`,
      header: `${nuevo ? 'Activar' : 'Desactivar'} producto`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.http.patch(`${this.apiProd}/${p.id}/estado?activo=${nuevo}`, {}).subscribe({
          next: () => {
            this.cargarProductos();
            this.toast('success', `Producto ${nuevo ? 'activado' : 'desactivado'}`);
          },
          error: () => this.toast('error', 'Error al cambiar estado'),
        });
      },
    });
  }

  // ── ELIMINAR ──────────────────────────────────────────
  confirmarEliminar(p: any): void {
    this.confirmationService.confirm({
      message: `¿Eliminar el producto <b>${p.nombre}</b>? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.http.delete(`${this.apiProd}/${p.id}`).subscribe({
          next: () => {
            this.cargarProductos();
            this.toast('success', 'Producto eliminado');
          },
          error: (err) => this.toast('error', err.error?.error || 'Error al eliminar'),
        });
      },
    });
  }

  // ── Helpers de color ──────────────────────────────────
  getCatColorBg(categoriaId: number): string {
    if (!categoriaId) return 'rgba(255,255,255,0.04)';
    return this.colores[categoriaId % this.colores.length].bg;
  }

  getCatColor(categoriaId: number): string {
    if (!categoriaId) return '#3a4a58';
    return this.colores[categoriaId % this.colores.length].fg;
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, detail, life: 3000 });
  }

  // ══════════════════════════════════════════════════════
  // IMPORTACIÓN MASIVA (Excel / imagen de factura o voucher)
  // ══════════════════════════════════════════════════════

  descargarPlantilla(): void {
    descargarPlantillaProductos();
  }

  async onExcelSeleccionado(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;

    try {
      const filas = await parseProductosExcel(file);
      if (filas.length === 0) {
        this.toast('warn', 'El archivo no tiene filas de productos');
        return;
      }
      this.resolverCategorias(filas);
      this.importRows = filas;
      this.importDialogVisible = true;
      this.cdr.markForCheck();
    } catch {
      this.toast('error', 'No se pudo leer el archivo. Verifica que sea un .xlsx válido');
    }
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.importandoImagen = true;
    this.importImagenError = '';
    this.cdr.markForCheck();

    const formData = new FormData();
    formData.append('imagen', file);

    this.http.post<any[]>(`${this.apiProd}/importar-imagen`, formData).subscribe({
      next: (items) => {
        this.importandoImagen = false;
        if (!items || items.length === 0) {
          this.toast('warn', 'No se reconoció ningún producto en la imagen');
          this.cdr.markForCheck();
          return;
        }
        const filas: ProductoImportRow[] = items.map((it) => ({
          nombre: it.nombre || '',
          codigoBarras: null,
          categoriaNombre: null,
          categoriaId: null,
          precioCompra: it.precioCompra ?? null,
          precioVenta: null,
          stock: it.cantidad ?? null,
          stockMinimo: null,
        }));
        this.importRows = filas;
        this.importDialogVisible = true;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.importandoImagen = false;
        this.importImagenError = err.error?.error || 'Error al analizar la imagen';
        this.toast('error', this.importImagenError);
        this.cdr.markForCheck();
      },
    });
  }

  /** Intenta resolver el nombre de categoría del excel contra las categorías existentes (sin distinguir mayúsculas). */
  private resolverCategorias(filas: ProductoImportRow[]): void {
    filas.forEach((f) => {
      if (!f.categoriaNombre) return;
      const match = this.categorias.find(
        (c) => c.nombre.toLowerCase().trim() === f.categoriaNombre!.toLowerCase().trim(),
      );
      f.categoriaId = match ? match.id : null;
    });
  }

  agregarFilaImport(): void {
    this.importRows.push({
      nombre: '',
      codigoBarras: null,
      categoriaNombre: null,
      categoriaId: null,
      precioCompra: null,
      precioVenta: null,
      stock: 0,
      stockMinimo: 0,
    });
    this.cdr.markForCheck();
  }

  quitarFilaImport(i: number): void {
    this.importRows.splice(i, 1);
    this.cdr.markForCheck();
  }

  filaImportValida(f: ProductoImportRow): boolean {
    return !!f.nombre?.trim() && f.precioVenta != null && f.precioVenta > 0;
  }

  get cantidadFilasValidas(): number {
    return this.importRows.filter((f) => this.filaImportValida(f)).length;
  }

  cerrarImportDialog(): void {
    this.importDialogVisible = false;
    this.importRows = [];
    this.importImagenError = '';
    this.cdr.markForCheck();
  }

  guardarImportacion(): void {
    const filasValidas = this.importRows.filter((f) => this.filaImportValida(f));
    if (filasValidas.length === 0) {
      this.toast('warn', 'No hay filas válidas para guardar');
      return;
    }

    this.importing = true;
    this.importProgreso = { hecho: 0, total: filasValidas.length };
    this.cdr.markForCheck();

    const llamadas = filasValidas.map((f) =>
      this.http
        .post(this.apiProd, {
          nombre: f.nombre.trim(),
          codigoBarras: f.codigoBarras || null,
          precioCompra: f.precioCompra ?? 0,
          precioVenta: f.precioVenta,
          stock: f.stock ?? 0,
          stockMinimo: f.stockMinimo ?? 0,
          categoriaId: f.categoriaId ?? null,
        })
        .pipe(
          catchError(() => {
            return of(null); // no detenemos el resto del lote por un error puntual
          }),
        ),
    );

    forkJoin(llamadas).subscribe((resultados) => {
      const exitosos = resultados.filter((r) => r !== null).length;
      const fallidos = resultados.length - exitosos;

      this.importing = false;
      this.cerrarImportDialog();
      this.cargarProductos();

      if (fallidos === 0) {
        this.toast('success', `${exitosos} producto(s) importado(s) correctamente`);
      } else {
        this.toast('warn', `${exitosos} importado(s), ${fallidos} fallaron. Revísalos e inténtalo de nuevo`);
      }
    });
  }
}
