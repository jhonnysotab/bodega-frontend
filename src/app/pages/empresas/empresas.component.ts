import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG
import { TableModule }         from 'primeng/table';
import { ButtonModule }        from 'primeng/button';
import { DialogModule }        from 'primeng/dialog';
import { InputTextModule }     from 'primeng/inputtext';
import { SelectModule }        from 'primeng/select';
import { TagModule }           from 'primeng/tag';
import { ToastModule }         from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule }       from 'primeng/tooltip';
import { IconFieldModule }     from 'primeng/iconfield';
import { InputIconModule }     from 'primeng/inputicon';
import { MessageModule }       from 'primeng/message';
import { DatePickerModule }    from 'primeng/datepicker';
import { MessageService, ConfirmationService } from 'primeng/api';

import { AuthService } from '../../service/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-empresas',
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
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    IconFieldModule,
    InputIconModule,
    MessageModule,
    DatePickerModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './empresas.component.html',
  styleUrls:   ['./empresas.component.scss']
})
export class EmpresasComponent implements OnInit {

  empresas:     any[] = [];
  loading       = true;
  dialogVisible = false;
  editMode      = false;
  saving        = false;
  serverError   = '';

  empresaForm!: FormGroup;
  empresaEditId: number | null = null;

  planes = [
    { label: 'Básico',      value: 'BASICO' },
    { label: 'Estándar',    value: 'ESTANDAR' },
    { label: 'Premium',     value: 'PREMIUM' },
  ];

  private api = `${environment.apiUrl}/api/empresas`;

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
    this.cargarEmpresas();
  }

  // ── Form ──────────────────────────────────────────────
  initForm(): void {
    this.empresaForm = this.fb.group({
      nombre:           ['', Validators.required],
      ruc:              ['', [Validators.required, Validators.pattern(/^\d{11}$/)]],
      telefono:         [''],
      direccion:        [''],
      plan:             [''],
      fechaInicio:      [null],
      fechaVencimiento: [null],
    });
  }

  hasError(field: string): boolean {
    const c = this.empresaForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  // ── LISTAR ────────────────────────────────────────────
  cargarEmpresas(): void {
    this.loading = true;
    this.http.get<any[]>(this.api).subscribe({
      next: (data) => {
        this.empresas = data;
        this.loading  = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast('error', 'Error al cargar empresas');
      }
    });
  }

  // ── DIALOGS ───────────────────────────────────────────
  abrirDialogCrear(): void {
    this.editMode      = false;
    this.empresaEditId = null;
    this.serverError   = '';
    this.empresaForm.reset();
    this.dialogVisible = true;
    this.cdr.markForCheck();
  }

  abrirDialogEditar(e: any): void {
    this.editMode      = true;
    this.empresaEditId = e.id;
    this.serverError   = '';
    this.empresaForm.patchValue({
      nombre:           e.nombre,
      ruc:              e.ruc,
      telefono:         e.telefono,
      direccion:        e.direccion,
      plan:             e.plan,
      fechaInicio:      e.fechaInicio      ? new Date(e.fechaInicio)      : null,
      fechaVencimiento: e.fechaVencimiento ? new Date(e.fechaVencimiento) : null,
    });
    this.dialogVisible = true;
    this.cdr.markForCheck();
  }

  cerrarDialog(): void {
    this.dialogVisible = false;
    this.empresaForm.reset();
    this.cdr.markForCheck();
  }

  // ── GUARDAR ───────────────────────────────────────────
  guardar(): void {
    this.empresaForm.markAllAsTouched();
    if (this.empresaForm.invalid) return;

    this.saving      = true;
    this.serverError = '';

    const val  = this.empresaForm.value;
    const body = {
      ...val,
      fechaInicio:      val.fechaInicio      ? this.toDateStr(val.fechaInicio)      : null,
      fechaVencimiento: val.fechaVencimiento ? this.toDateStr(val.fechaVencimiento) : null,
    };

    const req = this.editMode && this.empresaEditId
      ? this.http.put(`${this.api}/${this.empresaEditId}`, body)
      : this.http.post(this.api, body);

    req.subscribe({
      next: () => {
        this.saving = false;
        this.cerrarDialog();
        this.cargarEmpresas();
        this.toast('success', this.editMode ? 'Empresa actualizada' : 'Empresa creada');
      },
      error: (err) => {
        this.saving      = false;
        this.serverError = err.error?.error || 'Error al guardar empresa';
        this.cdr.markForCheck();
      }
    });
  }

  // ── TOGGLE ESTADO ─────────────────────────────────────
  toggleEstado(e: any): void {
    const nuevo  = !e.activo;
    const accion = nuevo ? 'activar' : 'desactivar';

    this.confirmationService.confirm({
      message: `¿Deseas ${accion} la empresa <b>${e.nombre}</b>?`,
      header:  `${nuevo ? 'Activar' : 'Desactivar'} empresa`,
      icon:    'pi pi-exclamation-triangle',
      accept:  () => {
        this.http.patch(`${this.api}/${e.id}/estado?activo=${nuevo}`, {}).subscribe({
          next: () => {
            this.cargarEmpresas();
            this.toast('success', `Empresa ${nuevo ? 'activada' : 'desactivada'}`);
          },
          error: () => this.toast('error', 'Error al cambiar estado')
        });
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────
  getPlanSeverity(plan: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
      PREMIUM:  'warn',
      ESTANDAR: 'info',
      BASICO:   'secondary',
    };
    return map[plan] ?? 'secondary';
  }

  getEstadoPlanSeverity(estado: string): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    const map: Record<string, 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast'> = {
      VIGENTE:    'success',
      VENCIDO:    'danger',
      'SIN PLAN': 'secondary',
    };
    return map[estado] ?? 'secondary';
  }

  isVencido(fecha: string): boolean {
    if (!fecha) return false;
    return new Date(fecha) < new Date();
  }

  private toDateStr(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, detail, life: 3000 });
  }
}