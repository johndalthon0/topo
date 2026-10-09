import { Injectable, signal } from '@angular/core';

export interface SolicitudConfirmacion {
  mensaje: string;
  textoAceptar: string;
  textoCancelar: string;
}

/**
 * Reemplazo de `confirm()` nativo por un modal propio del sistema.
 *
 * Uso: inyectar con `private confirmacion = inject(ConfirmacionService);`
 * y usar `await this.confirmacion.confirmar('¿Seguro?')` donde antes
 * había `confirm('¿Seguro?')`.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {

  readonly solicitud = signal<SolicitudConfirmacion | null>(null);

  private resolver: ((valor: boolean) => void) | null = null;

  confirmar(
    mensaje: string,
    opciones: { textoAceptar?: string; textoCancelar?: string } = {}
  ): Promise<boolean> {

    this.solicitud.set({
      mensaje,
      textoAceptar: opciones.textoAceptar ?? 'Aceptar',
      textoCancelar: opciones.textoCancelar ?? 'Cancelar',
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  responder(valor: boolean): void {
    this.solicitud.set(null);
    this.resolver?.(valor);
    this.resolver = null;
  }
}
