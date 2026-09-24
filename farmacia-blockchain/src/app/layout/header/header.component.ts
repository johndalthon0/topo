import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  Inject,
  PLATFORM_ID
} from '@angular/core';

import {
  CommonModule,
  isPlatformBrowser
} from '@angular/common';

import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {

  @Output() menuToggle = new EventEmitter<void>();

  fecha = new Date();
  usuario = '';
  rolUsuario = '';

  apiAlertas = `${environment.apiUrl}/api/alertas/notificaciones/`;

  mostrarNotificaciones = false;
  noLeidas = 0;
  notificaciones: any[] = [];
  cargandoNotificaciones = false;
  private temporizador: any;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cargarUsuario();
    this.cargarContador();
    this.temporizador = setInterval(() => this.cargarContador(), 5000);
  }

  private cargarUsuario(): void {
    try {
      const usuarioGuardado = sessionStorage.getItem('usuario');
      const datos = usuarioGuardado ? JSON.parse(usuarioGuardado) : {};

      this.usuario =
        datos?.nombre ||
        datos?.usuario ||
        datos?.username ||
        '';

      this.rolUsuario =
        datos?.rol ||
        sessionStorage.getItem('rol') ||
        '';
    } catch {
      this.usuario = '';
      this.rolUsuario = '';
    }
  }

  ngOnDestroy(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
    }
  }

  abrirCerrarMenu(): void {
    this.menuToggle.emit();
  }

  toggleNotificaciones(): void {
    this.mostrarNotificaciones = !this.mostrarNotificaciones;
    if (this.mostrarNotificaciones) {
      this.cargarNotificaciones();
    }
  }

  cargarContador(): void {
    this.http
      .get<any>(this.apiAlertas + 'contador/')
      .subscribe({
        next: (res) => this.noLeidas = Number(res?.no_leidas ?? 0),
        error: () => this.noLeidas = 0
      });
  }

  cargarNotificaciones(): void {
    this.cargandoNotificaciones = true;

    this.http
      .get<any>(this.apiAlertas + '?limite=6')
      .subscribe({
        next: (res) => {
          this.notificaciones = Array.isArray(res?.notificaciones)
            ? res.notificaciones
            : [];
          this.noLeidas = Number(res?.no_leidas ?? 0);
          this.cargandoNotificaciones = false;
        },
        error: () => {
          this.notificaciones = [];
          this.cargandoNotificaciones = false;
        }
      });
  }

  abrirNotificacion(item: any): void {
    if (!item?.leida) {
      this.http
        .post(this.apiAlertas + item.id + '/leida/', {})
        .subscribe({
          next: () => {
            item.leida = true;
            this.noLeidas = Math.max(0, this.noLeidas - 1);
          }
        });
    }
  }

  verTodas(): void {
    this.mostrarNotificaciones = false;
    this.router.navigateByUrl('/alertas');
  }

  formatearTabla(tabla: string): string {
    const nombres: Record<string, string> = {
      'medicamentos': 'Medicamentos',
      'compras_proveedor': 'Proveedores',
      'compras_compra': 'Compras',
      'compras_detallecompra': 'Detalle de compra',
      'compras_registroblockchain': 'Blockchain de compras',
      'ventas_venta': 'Ventas',
      'ventas_detalleventa': 'Detalle de venta',
      'ventas_registroblockchainventa': 'Blockchain de ventas',
      'usuarios_usuario': 'Usuarios',
      'usuarios_sistema_usuariosistema': 'Usuarios del sistema',
      'reporte': 'Reportes'
    };

    return nombres[tabla] || tabla;
  }
}
