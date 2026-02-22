import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG
import { InputTextModule }  from 'primeng/inputtext';
import { ButtonModule }     from 'primeng/button';
import { MessageModule }    from 'primeng/message';
import { ToastModule }      from 'primeng/toast';
import { DividerModule }    from 'primeng/divider';
import { IconFieldModule }  from 'primeng/iconfield';
import { InputIconModule }  from 'primeng/inputicon';
import { MessageService }   from 'primeng/api';

import { AuthService } from '../service/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    MessageModule,
    ToastModule,
    DividerModule,
    IconFieldModule,
    InputIconModule,
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  loginForm: FormGroup = new FormGroup({});
  isLoading    = false;
  showPassword = false;
  serverError  = '';

  constructor(
    private fb:             FormBuilder,
    private authService:    AuthService,
    private messageService: MessageService,
    private router:         Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  ngOnInit(): void {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  hasError(field: string): boolean {
    const control = this.loginForm.get(field);
    return !!(control?.invalid && control?.touched);
  }

  onSubmit(): void {
    this.loginForm.markAllAsTouched();
    if (this.loginForm.invalid) return;

    this.isLoading   = true;
    this.serverError = '';

    const { username, password } = this.loginForm.value;

    this.authService.login({ username, password }).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.authService.saveSession(response);

        this.messageService.add({
          key:      'login-toast',
          severity: 'success',
          summary:  `¡Bienvenido, ${response.nombre}!`,
          detail:   'Sesión iniciada correctamente',
          life:     2500
        });

        setTimeout(() => this.router.navigate(['/dashboard']), 800);
      },
      error: (err) => {
        this.isLoading = false;

        if (err.status === 400 || err.status === 401) {
          this.serverError = err.error?.error || 'Usuario o contraseña incorrectos';
        } else if (err.status === 0) {
          this.serverError = 'No se pudo conectar con el servidor';
        } else {
          this.serverError = 'Ocurrió un error inesperado. Intenta nuevamente';
        }
      }
    });
  }
}