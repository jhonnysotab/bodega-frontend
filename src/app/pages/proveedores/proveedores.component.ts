import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG
import { TableModule }         from 'primeng/table';
import { ButtonModule }        from 'primeng/button';
import { DialogModule }        from 'primeng/dialog';
import { InputTextModule }     from 'primeng/inputtext';
import { MultiSelectModule }   from 'primeng/multiselect';
import { TagModule }           from 'primeng/tag';
import { AvatarModule }        from 'primeng/avatar';
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
  selector: 'app-proveedores',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    MultiSelectModule,
    TagModule,
    AvatarModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './proveedores.component.html',
  styleUrls:   ['./proveedores.component.scss']
})
export class ProveedoresComponent implements OnInit {

  proveedores:      any[] = [];
  categoriasOpciones: any[] = [];
  loading         = true;
  dialogVisible   = false;
  editMode        = false;
  saving          = false;
  serverError     = '';

  proveedorForm!:  FormGroup;
  proveedorEditId: number | null = null;

  private apiProv = `${environment.apiUrl}/api/proveedores`;
  private apiCats = `${environment.apiUrl}/api/categorias/activas`;

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
    this.cargarProveedores();
  }

  initForm(): void {
    this.proveedorForm = this.fb.group({
      nombre:           ['', [Validators.required, Validators.minLength(3)]],
      empresaProveedor: [''],
      telefono:         [''],
      categoriaIds:     [[]]
    });
  }

  hasError(field: string): boolean {
    const c = this.proveedorForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  // ── CARGAR CATEGORÍAS (para el multiselect) ───────────
  cargarCategorias(): void {
    this.http.get<any[]>(this.apiCats).subscribe({
      next: (data) => {
        this.categoriasOpciones = data;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  // ── LISTAR ────────────────────────────────────────────
  cargarProveedores(): void {
    this.loading = true;
    this.http.get<any[]>(this.apiProv).subscribe({
      next: (data) => {
        this.proveedores = data;
        this.loading     = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast('error', 'Error al cargar proveedores');
      }
    });
  }

  // ── DIALOGS ───────────────────────────────────────────
  abrirDialogCrear(): void {
    this.editMode       = false;
    this.proveedorEditId = null;
    this.serverError    = '';
    this.proveedorForm.reset({ categoriaIds: [] });
    this.dialogVisible  = true;
    this.cdr.markForCheck();
  }

  abrirDialogEditar(p: any): void {
    this.editMode       = true;
    this.proveedorEditId = p.id;
    this.serverError    = '';

    // Extraer solo los IDs de las categorías actuales
    const ids = p.categorias?.map((c: any) => c.id) ?? [];

    this.proveedorForm.patchValue({
      nombre:           p.nombre,
      empresaProveedor: p.empresaProveedor,
      telefono:         p.telefono,
      categoriaIds:     ids
    });
    this.dialogVisible = true;
    this.cdr.markForCheck();
  }

  cerrarDialog(): void {
    this.dialogVisible = false;
    this.proveedorForm.reset({ categoriaIds: [] });
    this.cdr.markForCheck();
  }

  // ── GUARDAR ───────────────────────────────────────────
  guardar(): void {
    this.proveedorForm.markAllAsTouched();
    if (this.proveedorForm.invalid) return;

    this.saving      = true;
    this.serverError = '';

    const body = {
      nombre:           this.proveedorForm.value.nombre,
      empresaProveedor: this.proveedorForm.value.empresaProveedor || null,
      telefono:         this.proveedorForm.value.telefono || null,
      categoriaIds:     this.proveedorForm.value.categoriaIds ?? []
    };

    const req = this.editMode && this.proveedorEditId
      ? this.http.put(`${this.apiProv}/${this.proveedorEditId}`, body)
      : this.http.post(this.apiProv, body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cerrarDialog();
        this.cargarProveedores();
        this.toast('success', this.editMode ? 'Proveedor actualizado' : 'Proveedor creado');
      },
      error: (err) => {
        this.saving      = false;
        this.serverError = err.error?.error || 'Error al guardar proveedor';
        this.cdr.markForCheck();
      }
    });
  }

  // ── TOGGLE ESTADO ─────────────────────────────────────
  toggleEstado(p: any): void {
    const nuevo  = !p.activo;
    const accion = nuevo ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Deseas ${accion} al proveedor <b>${p.nombre}</b>?`,
      header:  `${nuevo ? 'Activar' : 'Desactivar'} proveedor`,
      icon:    'pi pi-exclamation-triangle',
      accept:  () => {
        this.http.patch(`${this.apiProv}/${p.id}/estado?activo=${nuevo}`, {}).subscribe({
          next: () => {
            this.cargarProveedores();
            this.toast('success', `Proveedor ${nuevo ? 'activado' : 'desactivado'}`);
          },
          error: () => this.toast('error', 'Error al cambiar estado')
        });
      }
    });
  }

  // ── ELIMINAR ──────────────────────────────────────────
  confirmarEliminar(p: any): void {
    this.confirmationService.confirm({
      message: `¿Eliminar al proveedor <b>${p.nombre}</b>? Esta acción no se puede deshacer.`,
      header:  'Confirmar eliminación',
      icon:    'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept:  () => {
        this.http.delete(`${this.apiProv}/${p.id}`).subscribe({
          next: () => {
            this.cargarProveedores();
            this.toast('success', 'Proveedor eliminado');
          },
          error: (err) => this.toast('error', err.error?.error || 'Error al eliminar')
        });
      }
    });
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, detail, life: 3000 });
  }
}