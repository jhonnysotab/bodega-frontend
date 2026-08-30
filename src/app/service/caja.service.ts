import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Caja {
  id: number;
  estado: 'ABIERTA' | 'CERRADA';
  montoInicial: number;
  montoFinalDeclarado?: number;
  montoFinalSistema?: number;
  diferencia?: number;
  notaApertura?: string;
  notaCierre?: string;
  usuarioAperturaId: number;
  usuarioAperturaNombre: string;
  usuarioCierreId?: number;
  usuarioCierreNombre?: string;
  fechaApertura: string;
  fechaCierre?: string;
  cantidadVentas: number;
  totalVentas: number;
  totalVentasEfectivo: number;
  totalVentasYape: number;
  totalVentasPlin: number;
  totalVentasTransferencia: number;
  totalGastos: number;
  efectivoEsperado: number;
}

@Injectable({ providedIn: 'root' })
export class CajaService {
  private apiUrl = `${environment.apiUrl}/api/caja`;

  private cajaActualSubject = new BehaviorSubject<Caja | null>(null);
  cajaActual$ = this.cajaActualSubject.asObservable();

  constructor(private http: HttpClient) {}

  get cajaAbierta(): Caja | null {
    return this.cajaActualSubject.value;
  }

  cargarActual(): Observable<Caja | null> {
    return this.http
      .get<Caja | null>(`${this.apiUrl}/actual`)
      .pipe(tap((caja) => this.cajaActualSubject.next(caja)));
  }

  abrir(montoInicial: number, nota?: string): Observable<Caja> {
    return this.http
      .post<Caja>(`${this.apiUrl}/abrir`, { montoInicial, nota: nota || null })
      .pipe(tap((caja) => this.cajaActualSubject.next(caja)));
  }

  cerrar(montoFinalDeclarado: number, nota?: string): Observable<Caja> {
    return this.http
      .post<Caja>(`${this.apiUrl}/cerrar`, { montoFinalDeclarado, nota: nota || null })
      .pipe(tap(() => this.cajaActualSubject.next(null)));
  }

  listar(): Observable<Caja[]> {
    return this.http.get<Caja[]>(this.apiUrl);
  }

  obtener(id: number): Observable<Caja> {
    return this.http.get<Caja>(`${this.apiUrl}/${id}`);
  }
}
