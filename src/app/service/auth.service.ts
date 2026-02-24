import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token:     string;
  username:  string;
  nombre:    string;
  rol:       string;
  empresaId: number;
  empresaNombre: string;
}

export interface UserSession {
  username:  string;
  nombre:    string;
  rol:       string;
  empresaId: number;
  empresaNombre: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private apiUrl = `${environment.apiUrl}/api/auth`;

  private readonly TOKEN_KEY = 'pos_token';
  private readonly USER_KEY  = 'pos_user';

  constructor(private http: HttpClient) {}

  // ── HTTP ────────────────────────────────────────────────
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials);
  }

  // ── Sesión ──────────────────────────────────────────────
  saveSession(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify({
      username:  response.username,
      nombre:    response.nombre,
      rol:       response.rol,
      empresaId: response.empresaId,
      empresaNombre : response.empresaNombre
    } as UserSession));
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getUser(): UserSession | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) as UserSession : null;
  }

  getNombre(): string {
    return this.getUser()?.nombre ?? '';
  }

  getUsername(): string {
    return this.getUser()?.username ?? '';
  }

  getRol(): string {
    return this.getUser()?.rol ?? '';
  }

  getEmpresaId(): number {
    return this.getUser()?.empresaId ?? 0;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    return this.getRol() === 'ADMIN';
  }

  isCajero(): boolean {
    return this.getRol() === 'CAJERO';
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }
}