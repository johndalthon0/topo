import { Injectable, signal } from '@angular/core';

export type TipoNotificacion = 'exito' | 'error' | 'info';

export interface Notificacion {
  id: number;
  texto: string;
  tipo: TipoNotificacion;
}

/**
 * Reemplazo de `alert()` nativo por un aviso propio del sistema,
 * consistente en toda la app (no bloquea, no depende del navegador).
 *
 * Uso: inyectar con `private toast = inject(NotificacionService);`
 * y llamar `this.toast.mostrar('mensaje')` donde antes había `alert('mensaje')`.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionService {

  private contador = 0;

  readonly notificacion = signal<Notificacion | null>(null);

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  mostrar(texto: string, tipo?: TipoNotificacion, duracionMs?: number): void {

    const tipoFinal = tipo ?? this.detectarTipo(texto);

    const duracion = duracionMs ?? (tipoFinal === 'error' ? 6000 : 4000);

    this.contador += 1;

    this.notificacion.set({
      id: this.contador,
      texto: this.limpiarTexto(texto),
      tipo: tipoFinal,
    });

    if (this.temporizador) {
      clearTimeout(this.temporizador);
    }

    this.temporizador = setTimeout(() => this.cerrar(), duracion);
  }

  exito(texto: string, duracionMs?: number): void {
    this.mostrar(texto, 'exito', duracionMs);
  }

  error(texto: string, duracionMs?: number): void {
    this.mostrar(texto, 'error', duracionMs);
  }

  info(texto: string, duracionMs?: number): void {
    this.mostrar(texto, 'info', duracionMs);
  }

  cerrar(): void {
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    this.notificacion.set(null);
  }

  /** Muchos mensajes del sistema ya usan ✅ / ❌ como prefijo; se aprovecha para no tocar esos textos. */
  private detectarTipo(texto: string): TipoNotificacion {
    if (texto.startsWith('✅')) return 'exito';
    if (texto.startsWith('❌')) return 'error';
    return 'info';
  }

  private limpiarTexto(texto: string): string {
    return texto.replace(/^✅\s*/, '').replace(/^❌\s*/, '').trim();
  }
}
