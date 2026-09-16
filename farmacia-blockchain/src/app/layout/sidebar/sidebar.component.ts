import {
  Component,
  EventEmitter,
  Input,
  Output,
  Inject,
  PLATFORM_ID
} from '@angular/core';

import {
  CommonModule,
  isPlatformBrowser
} from '@angular/common';

import {
  Router,
  RouterModule
} from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent {

  @Input() abierto = false;
  @Output() cerrarMenu = new EventEmitter<void>();

  nombreUsuario = '';
  rolUsuario = '';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.cargarUsuario();
  }

  get esAdministrador(): boolean {
    return this.rolUsuario === 'Administrador';
  }

  private cargarUsuario(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const usuarioGuardado = sessionStorage.getItem('usuario');
      const datos = usuarioGuardado ? JSON.parse(usuarioGuardado) : {};

      this.nombreUsuario =
        datos?.nombre ||
        datos?.usuario ||
        datos?.username ||
        '';

      this.rolUsuario =
        datos?.rol ||
        sessionStorage.getItem('rol') ||
        '';
    } catch {
      this.nombreUsuario = '';
      this.rolUsuario = '';
    }
  }

  cerrarSidebar(): void {
    this.cerrarMenu.emit();
  }

  cerrarSesion(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const confirmar = window.confirm('¿Deseas cerrar sesión?');

    if (!confirmar) {
      return;
    }

    sessionStorage.removeItem('usuario');
    sessionStorage.removeItem('rol');
    sessionStorage.removeItem('token');

    this.cerrarSidebar();

    this.router
      .navigateByUrl('/login')
      .then((navegacionCorrecta) => {
        if (!navegacionCorrecta) {
          window.location.href = '/login';
        }
      })
      .catch(() => {
        window.location.href = '/login';
      });
  }
}
