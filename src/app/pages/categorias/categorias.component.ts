import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG
import { TableModule }         from 'primeng/table';
import { ButtonModule }        from 'primeng/button';
import { DialogModule }        from 'primeng/dialog';
import { InputTextModule }     from 'primeng/inputtext';
import { TagModule }           from 'primeng/tag';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule }       from 'primeng/tooltip';
import { IconFieldModule }     from 'primeng/iconfield';
import { InputIconModule }     from 'primeng/inputicon';
import { MessageModule }       from 'primeng/message';
import { MessageService, ConfirmationService } from 'primeng/api';

import { AuthService } from '../../service/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-categorias',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './categorias.component.html',
  styleUrls:   ['./categorias.component.scss']
})
export class CategoriasComponent implements OnInit {

  categorias:    any[] = [];
  loading        = true;
  dialogVisible  = false;
  editMode       = false;
  saving         = false;
  serverError    = '';

  categoriaForm!:  FormGroup;
  categoriaEditId: number | null = null;

  // Paleta de colores para los iconos
  private colores = [
    { bg: 'rgba(45,189,122,0.12)',  fg: '#2dbd7a' },
    { bg: 'rgba(59,130,246,0.12)',  fg: '#3b82f6' },
    { bg: 'rgba(245,158,11,0.12)',  fg: '#f59e0b' },
    { bg: 'rgba(239,68,68,0.12)',   fg: '#ef4444' },
    { bg: 'rgba(168,85,247,0.12)',  fg: '#a855f7' },
    { bg: 'rgba(20,184,166,0.12)',  fg: '#14b8a6' },
    { bg: 'rgba(249,115,22,0.12)',  fg: '#f97316' },
    { bg: 'rgba(236,72,153,0.12)',  fg: '#ec4899' },
  ];

  private api = `${environment.apiUrl}/api/categorias`;

  constructor(
    private fb:                  FormBuilder,
    private http:                HttpClient,
    private authService:         AuthService,
    private messageService:      MessageService,
    private confirmationService: ConfirmationService,
    private cdr:                 ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.cargarCategorias();
  }

  initForm(): void {
    this.categoriaForm = this.fb.group({
      nombre:      ['', [Validators.required, Validators.minLength(2)]],
      descripcion: ['']
    });
  }

  hasError(field: string): boolean {
    const c = this.categoriaForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  // ── LISTAR ────────────────────────────────────────────
  cargarCategorias(): void {
    this.loading = true;
    this.http.get<any[]>(this.api).subscribe({
      next: (data) => {
        this.categorias = data;
        this.loading    = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast('error', 'Error al cargar categorías');
      }
    });
  }

  // ── DIALOGS ───────────────────────────────────────────
  abrirDialogCrear(): void {
    this.editMode       = false;
    this.categoriaEditId = null;
    this.serverError    = '';
    this.categoriaForm.reset();
    this.dialogVisible  = true;
    this.cdr.markForCheck();
  }

  abrirDialogEditar(c: any): void {
    this.editMode       = true;
    this.categoriaEditId = c.id;
    this.serverError    = '';
    this.categoriaForm.patchValue({
      nombre:      c.nombre,
      descripcion: c.descripcion
    });
    this.dialogVisible = true;
    this.cdr.markForCheck();
  }

  cerrarDialog(): void {
    this.dialogVisible = false;
    this.categoriaForm.reset();
    this.cdr.markForCheck();
  }

  // ── GUARDAR ───────────────────────────────────────────
  guardar(): void {
    this.categoriaForm.markAllAsTouched();
    if (this.categoriaForm.invalid) return;

    this.saving      = true;
    this.serverError = '';

    const req = this.editMode && this.categoriaEditId
      ? this.http.put(`${this.api}/${this.categoriaEditId}`, this.categoriaForm.value)
      : this.http.post(this.api, this.categoriaForm.value);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cerrarDialog();
        this.cargarCategorias();
        this.toast('success', this.editMode ? 'Categoría actualizada' : 'Categoría creada');
      },
      error: (err) => {
        this.saving      = false;
        this.serverError = err.error?.error || 'Error al guardar categoría';
        this.cdr.markForCheck();
      }
    });
  }

  // ── TOGGLE ESTADO ─────────────────────────────────────
  toggleEstado(c: any): void {
    const nuevo  = !c.activo;
    const accion = nuevo ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Deseas ${accion} la categoría <b>${c.nombre}</b>?`,
      header:  `${nuevo ? 'Activar' : 'Desactivar'} categoría`,
      icon:    'pi pi-exclamation-triangle',
      accept:  () => {
        this.http.patch(`${this.api}/${c.id}/estado?activo=${nuevo}`, {}).subscribe({
          next: () => {
            this.cargarCategorias();
            this.toast('success', `Categoría ${nuevo ? 'activada' : 'desactivada'}`);
          },
          error: () => this.toast('error', 'Error al cambiar estado')
        });
      }
    });
  }

  // ── ELIMINAR ──────────────────────────────────────────
  confirmarEliminar(c: any): void {
    this.confirmationService.confirm({
      message: `¿Eliminar la categoría <b>${c.nombre}</b>? Los productos asociados quedarán sin categoría.`,
      header:  'Confirmar eliminación',
      icon:    'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept:  () => {
        this.http.delete(`${this.api}/${c.id}`).subscribe({
          next: () => {
            this.cargarCategorias();
            this.toast('success', 'Categoría eliminada');
          },
          error: (err) => this.toast('error', err.error?.error || 'Error al eliminar')
        });
      }
    });
  }

  // ── Color por id (para los iconos) ────────────────────
  getColorBg(id: number): string {
    return this.colores[id % this.colores.length].bg;
  }

  getColor(id: number): string {
    return this.colores[id % this.colores.length].fg;
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, detail, life: 3000 });
  }
}