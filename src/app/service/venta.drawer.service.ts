import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VentaDrawerService {
  private _abrir$ = new Subject<void>();
  abrir$ = this._abrir$.asObservable();

  abrir(): void {
    this._abrir$.next();
  }
}