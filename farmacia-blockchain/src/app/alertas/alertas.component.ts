import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-alertas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alertas.component.html',
  styleUrls: ['./alertas.component.css']
})
export class AlertasComponent implements OnInit {

  api = `${environment.apiUrl}/api/alertas/notificaciones/`;

  notificaciones: any[] = [];
  cargando = false;
  mensajeError = '';
  seleccionada: any = null;
  totalNoLeidas = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.http.get<any>(this.api + '?limite=100').subscribe({
      next: (res) => {
        this.notificaciones = Array.isArray(res?.notificaciones)
          ? res.notificaciones
          : [];
        this.totalNoLeidas = Number(res?.no_leidas ?? 0);
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        this.mensajeError = err?.error?.mensaje
          || 'No se pudieron cargar las notificaciones.';
      }
    });
  }

  verDetalle(item: any): void {
    this.seleccionada = item;
    this.http.get<any>(this.api + item.id + '/').subscribe({
      next: (res) => {
        this.seleccionada = res?.notificacion || item;
        if (!item.leida) {
          this.marcarLeida(item, false);
        }
      }
    });
  }

  cerrarDetalle(): void {
    this.seleccionada = null;
  }

  marcarLeida(item: any, recargar = true): void {
    this.http.post(this.api + item.id + '/leida/', {}).subscribe({
      next: () => {
        item.leida = true;
        this.totalNoLeidas = Math.max(0, this.totalNoLeidas - 1);
        if (recargar) {
          this.cargar();
        }
      }
    });
  }

  marcarTodas(): void {
    this.http.post(this.api + 'marcar-todas/', {}).subscribe({
      next: () => this.cargar()
    });
  }

  nombreTabla(tabla: string): string {
    const mapa: Record<string, string> = {
      'medicamentos': 'Medicamentos',
      'compras_proveedor': 'Proveedores',
      'compras_compra': 'Compras',
      'compras_detallecompra': 'Detalle de compras',
      'compras_registroblockchain': 'Blockchain de compras',
      'ventas_venta': 'Ventas',
      'ventas_detalleventa': 'Detalle de ventas',
      'ventas_registroblockchainventa': 'Blockchain de ventas',
      'usuarios_usuario': 'Usuarios',
      'usuarios_sistema_usuariosistema': 'Usuarios del sistema',
      'reporte': 'Reportes'
    };
    return mapa[tabla] || tabla;
  }

  claseAccion(accion: string): string {
    return (accion || '').toLowerCase();
  }
}
