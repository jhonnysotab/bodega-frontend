import { Component, OnInit, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { AuthService } from '../../service/auth.service';
import { Caja, CajaService } from '../../service/caja.service';

@Component({
  selector: 'app-caja',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, TableModule, ToastModule, MessageModule],
  providers: [MessageService],
  templateUrl: './caja.component.html',
  styleUrls: ['./caja.component.scss'],
})
export class CajaComponent implements OnInit {
  loading = true;
  cajaActual: Caja | null = null;
  historial: Caja[] = [];

  userName = '';

  // Apertura
  montoInicial: number | null = null;
  notaApertura = '';
  abriendo = false;
  serverErrorApertura = '';

  // Cierre
  cierreDialogVisible = false;
  montoFinalDeclarado: number | null = null;
  notaCierre = '';
  cerrando = false;
  serverErrorCierre = '';

  constructor(
    private cajaService: CajaService,
    private authService: AuthService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.userName = this.authService.getNombre();
    this.cargarActual();
    this.cargarHistorial();
  }

  cargarActual(): void {
    this.loading = true;
    this.cajaService.cargarActual().subscribe({
      next: (caja) => {
        this.cajaActual = caja;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  cargarHistorial(): void {
    this.cajaService.listar().subscribe({
      next: (data) => {
        this.historial = data.filter((c) => c.estado === 'CERRADA').slice(0, 10);
        this.cdr.markForCheck();
      },
    });
  }

  // ── APERTURA ──────────────────────────────────────────
  abrirCaja(): void {
    this.serverErrorApertura = '';
    if (this.montoInicial === null || this.montoInicial < 0) {
      this.serverErrorApertura = 'Ingresa un monto inicial válido';
      this.cdr.markForCheck();
      return;
    }

    this.abriendo = true;
    this.cajaService.abrir(this.montoInicial, this.notaApertura).subscribe({
      next: (caja) => {
        this.abriendo = false;
        this.cajaActual = caja;
        this.montoInicial = null;
        this.notaApertura = '';
        this.cdr.markForCheck();
        this.toast('success', 'Caja abierta correctamente');
      },
      error: (err) => {
        this.abriendo = false;
        this.serverErrorApertura = err.error?.error || 'Error al abrir la caja';
        this.cdr.markForCheck();
      },
    });
  }

  // ── CIERRE ────────────────────────────────────────────
  abrirDialogCierre(): void {
    this.montoFinalDeclarado = null;
    this.notaCierre = '';
    this.serverErrorCierre = '';
    this.cierreDialogVisible = true;
    this.cdr.markForCheck();
  }

  cerrarDialogCierre(): void {
    this.cierreDialogVisible = false;
    this.cdr.markForCheck();
  }

  get diferenciaPreview(): number | null {
    if (this.montoFinalDeclarado === null || !this.cajaActual) return null;
    return this.montoFinalDeclarado - this.cajaActual.efectivoEsperado;
  }

  confirmarCierre(): void {
    this.serverErrorCierre = '';
    if (this.montoFinalDeclarado === null || this.montoFinalDeclarado < 0) {
      this.serverErrorCierre = 'Ingresa el monto contado en caja';
      this.cdr.markForCheck();
      return;
    }

    this.cerrando = true;
    this.cajaService.cerrar(this.montoFinalDeclarado, this.notaCierre).subscribe({
      next: () => {
        this.cerrando = false;
        this.cierreDialogVisible = false;
        this.cajaActual = null;
        this.cargarHistorial();
        this.cdr.markForCheck();
        this.toast('success', 'Caja cerrada correctamente');
      },
      error: (err) => {
        this.cerrando = false;
        this.serverErrorCierre = err.error?.error || 'Error al cerrar la caja';
        this.cdr.markForCheck();
      },
    });
  }

  private toast(severity: string, detail: string): void {
    this.messageService.add({ severity, detail, life: 3000 });
  }
}
