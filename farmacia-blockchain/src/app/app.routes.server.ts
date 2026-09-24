import { RenderMode, ServerRoute } from '@angular/ssr';

// Esta app es un panel interno detrás de login (no necesita SEO/prerender).
// RenderMode.Client evita que el build intente prerenderizar en el servidor
// rutas que dependen de HttpClient + guards de sesión (localStorage no
// existe en el contexto de build/servidor).
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
