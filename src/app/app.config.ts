import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

// PrimeNG
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    providePrimeNG({
      theme: {
        preset: Aura,
        options: {
          // Modo oscuro basado en la clase del HTML
          darkModeSelector: '.dark-mode',
          cssLayer: {
            name:  'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities'
          }
        }
      },
      // Traducciones al español
      translation: {
        accept:       'Aceptar',
        reject:       'Cancelar',
        cancel:       'Cancelar',
        //close:        'Cerrar',
        clear:        'Limpiar',
        apply:        'Aplicar',
        //search:       'Buscar',
        //noResultsMsg: 'Sin resultados',
        emptyMessage: 'Sin datos'
      }
    })
  ]
};