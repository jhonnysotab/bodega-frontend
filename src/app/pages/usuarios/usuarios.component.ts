import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG
import { TableModule }          from 'primeng/table';
import { ButtonModule }         from 'primeng/button';
import { DialogModule }         from 'primeng/dialog';
import { InputTextModule }      from 'primeng/inputtext';
import { SelectModule }         from 'primeng/select';
import { TagModule }            from 'primeng/tag';
import { AvatarModule }         from 'primeng/avatar';
import { ToastModule }          from 'primeng/toast';
import { ConfirmDialogModule }  from 'primeng/confirmdialog';
import { TooltipModule }        from 'primeng/tooltip';
import { IconFieldModule }      from 'primeng/iconfield';
import { InputIconModule }      from 'primeng/inputicon';
import { MessageModule }        from 'primeng/message';
import { MessageService, ConfirmationService } from 'primeng/api';

import { AuthService }  from '../../service/auth.service';
import { environment }  from '../../../environments/environment';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush, 
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
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
  templateUrl: './usuarios.component.html',
  styleUrls:   ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
 
  usuarios:     any[] = [];
  loading       = true;
  dialogVisible = false;
  editMode      = false;
  saving        = false;
  showPass      = false;
  serverError   = '';
  isAdmin       = false;

  usuarioForm!: FormGroup;
  usuarioEditId: number | null = null;

  roles = [
    { label: 'Administrador', value: 'ADMIN' },
    { label: 'Cajero',        value: 'CAJERO' }
  ];

  private api = `${environment.apiUrl}/api/usuarios`;

  constructor(
    private fb:                  FormBuilder,
    private http:                HttpClient,
    private authService:         AuthService,
    private messageService:      MessageService,
    private confirmationService: ConfirmationService,
    private cdr:                 ChangeDetectorRef  
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.initForm();
    this.cargarUsuarios();
  }

  initForm(): void {
    this.usuarioForm = this.fb.group({
      nombre:   ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rol:      ['', Validators.required]
    });
  }

  hasError(field: string): boolean {
    const c = this.usuarioForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  cargarUsuarios(): void {
    this.loading = true;
    this.http.get<any[]>(this.api).subscribe({
      next: (data) => {
        this.usuarios = data;
        this.loading  = false;
        this.cdr.markForCheck(); 
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast('error', 'Error al cargar usuarios');
      }
    });
  }

  abrirDialogCrear(): void {
    this.editMode      = false;
    this.usuarioEditId = null;
    this.serverError   = '';
    this.showPass      = false;
    this.usuarioForm.reset();
    this.usuarioForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.usuarioForm.get('password')?.updateValueAndValidity();
    this.dialogVisible = true;
    this.cdr.markForCheck();
  }

  abrirDialogEditar(u: any): void {
    this.editMode      = true;
    this.usuarioEditId = u.id;
    this.serverError   = '';
    this.usuarioForm.get('password')?.clearValidators();
    this.usuarioForm.get('password')?.updateValueAndValidity();
    this.usuarioForm.patchValue({
      nombre:   u.nombre,
      username: u.username,
      rol:      u.rol
    });
    this.dialogVisible = true;
    this.cdr.markForCheck();
  }

  cerrarDialog(): void {
    this.dialogVisible = false;
    this.usuarioForm.reset();
    this.cdr.markForCheck();
  }

  guardar(): void {
    this.usuarioForm.markAllAsTouched();
    if (this.usuarioForm.invalid) return;

    this.saving      = true;
    this.serverError = '';

    if (this.editMode && this.usuarioEditId) {
      const body = {
        nombre:   this.usuarioForm.value.nombre,
        username: this.usuarioForm.value.username,
        rol:      this.usuarioForm.value.rol
      };
      this.http.put(`${this.api}/${this.usuarioEditId}`, body).subscribe({
        next: () => {
          this.saving = false;
          this.cerrarDialog();
          this.cargarUsuarios();
          this.toast('success', 'Usuario actualizado correctamente');
        },
        error: (err) => {
          this.saving      = false;
          this.serverError = err.error?.error || 'Error al actualizar usuario';
          this.cdr.markForCheck();
        }
      });
    } else {
      this.http.post(this.api, this.usuarioForm.value).subscribe({
        next: () => {
          this.saving = false;
          this.cerrarDialog();
          this.cargarUsuarios();
          this.toast('success', 'Usuario creado correctamente');
        },
        error: (err) => {
          this.saving      = false;
          this.serverError = err.error?.error || 'Error al crear usuario';
          this.cdr.markForCheck();
        }
      });
    }
  }

  toggleEstado(u: any): void {
    const nuevoEstado = !u.activo;
    const accion      = nuevoEstado ? 'activar' : 'desactivar';
    this.confirmationService.confirm({
      message: `¿Deseas ${accion} al usuario <b>${u.nombre}</b>?`,
      header:  `${nuevoEstado ? 'Activar' : 'Desactivar'} usuario`,
      icon:    'pi pi-exclamation-triangle',
      accept:  () => {
        
        this.http.patch(`${this.api}/${u.id}?activo=${nuevoEstado}`, {}).subscribe({
          next: () => {
            this.cargarUsuarios();
            this.toast('success', `Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`);
          },
          error: () => this.toast('error', 'Error al cambiar estado')
        });
      }
    });
  }

  confirmarEliminar(u: any): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar a <b>${u.nombre}</b>? Esta acción no se puede deshacer.`,
      header:  'Confirmar eliminación',
      icon:    'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      accept:  () => {
        this.http.delete(`${this.api}/${u.id}`).subscribe({
          next: () => {
            this.cargarUsuarios();
            this.toast('success', 'Usuario eliminado');
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