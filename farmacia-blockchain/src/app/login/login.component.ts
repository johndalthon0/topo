import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import {
  HttpClient,
  HttpClientModule
} from '@angular/common/http';

import { Router } from '@angular/router';
import { environment } from '../../environments/environment';


@Component({
  selector: 'app-login',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],

  templateUrl:
    './login.component.html',

  styleUrls: [
    './login.component.css'
  ]
})


export class LoginComponent {


  private API =
    `${environment.apiUrl}/api/usuarios-sistema`;


  mostrarRegistro = false;

  mostrarPassword = false;


  usuario = '';

  password = '';

  nombre = '';

  correo = '';

  confirmarPassword = '';

  aceptarTerminos = false;

  recordarme = false;


  // =====================================================
  // RECUPERACIÓN
  // =====================================================

  mostrarRecuperacion = false;

  pasoRecuperacion = 1;

  correoRecuperacion = '';

  codigoGenerado = '';

  codigoRecuperacion = '';

  nuevaPassword = '';

  confirmarNuevaPassword = '';

  mensajeRecuperacion = '';

  mensajeError = false;

  cargandoRecuperacion = false;


  constructor(
    private http: HttpClient,
    private router: Router
  ) {}


  // =====================================================
  // CAMBIAR LOGIN / REGISTRO
  // =====================================================

  cambiarModo(
    registro: boolean
  ): void {

    this.mostrarRegistro =
      registro;

    this.password =
      '';

    this.confirmarPassword =
      '';

    this.mostrarPassword =
      false;

  }


  // =====================================================
  // LOGIN
  // =====================================================

  iniciarSesion(): void {

    if (
      !this.usuario.trim()
      ||
      !this.password.trim()
    ) {

      alert(
        'Complete usuario y contraseña'
      );

      return;

    }


    this.http
      .post<any>(
        `${this.API}/login/`,
        {

          usuario:
            this.usuario.trim(),

          password:
            this.password.trim()

        }
      )
      .subscribe({


        next: respuesta => {

          if (
            respuesta.estado
          ) {

            sessionStorage.setItem(
              'usuario',
              JSON.stringify(
                respuesta.usuario
              )
            );


            sessionStorage.setItem(
              'rol',
              respuesta.usuario.rol
            );


            this.router.navigate(
              ['/dashboard']
            );

          }

        },


        error: error => {

          alert(
            error.error?.mensaje
            ||
            'No se pudo iniciar sesión'
          );

        }

      });

  }


  // =====================================================
  // REGISTRO
  // =====================================================

  crearCuenta(): void {

    if (
      !this.nombre.trim()
      ||
      !this.usuario.trim()
      ||
      !this.correo.trim()
      ||
      !this.password
      ||
      !this.confirmarPassword
    ) {

      alert(
        'Complete todos los campos'
      );

      return;

    }


    if (
      this.password
      !==
      this.confirmarPassword
    ) {

      alert(
        'Las contraseñas no coinciden'
      );

      return;

    }


    if (
      !this.aceptarTerminos
    ) {

      alert(
        'Debe aceptar los términos'
      );

      return;

    }


    this.http
      .post<any>(
        `${this.API}/registro/`,
        {

          nombre:
            this.nombre.trim(),

          usuario:
            this.usuario.trim(),

          correo:
            this.correo.trim(),

          password:
            this.password

        }
      )
      .subscribe({


        next: respuesta => {

          alert(
            respuesta.mensaje
          );


          if (
            respuesta.estado
          ) {

            this.mostrarRegistro =
              false;

            this.nombre =
              '';

            this.usuario =
              '';

            this.correo =
              '';

            this.password =
              '';

            this.confirmarPassword =
              '';

            this.aceptarTerminos =
              false;

          }

        },


        error: error => {

          alert(
            error.error?.mensaje
            ||
            'No se pudo crear la cuenta'
          );

        }

      });

  }


  // =====================================================
  // RECUPERACIÓN
  // =====================================================

  abrirRecuperacion(): void {

    this.mostrarRecuperacion =
      true;

    this.pasoRecuperacion =
      1;

    this.correoRecuperacion =
      '';

    this.codigoGenerado =
      '';

    this.codigoRecuperacion =
      '';

    this.nuevaPassword =
      '';

    this.confirmarNuevaPassword =
      '';

    this.mensajeRecuperacion =
      '';

    this.mensajeError =
      false;

  }


  cerrarRecuperacion(): void {

    this.mostrarRecuperacion =
      false;

  }


  // =====================================================
  // GENERAR CÓDIGO
  // =====================================================

  enviarCodigo(): void {

    if (
      !this.correoRecuperacion.trim()
    ) {

      this.mostrarMensaje(
        'Ingrese su correo electrónico',
        true
      );

      return;

    }


    this.cargandoRecuperacion =
      true;


    this.http
      .post<any>(
        `${this.API}/recuperar-password/solicitar/`,
        {

          correo:
            this.correoRecuperacion.trim()

        }
      )
      .subscribe({


        next: respuesta => {

          this.cargandoRecuperacion =
            false;


          if (
            respuesta.estado
          ) {

            this.codigoGenerado =
              respuesta.codigo;

            this.pasoRecuperacion =
              2;

            this.mostrarMensaje(
              'Código generado correctamente',
              false
            );

          }

        },


        error: error => {

          this.cargandoRecuperacion =
            false;


          this.mostrarMensaje(
            error.error?.mensaje
            ||
            'No se pudo generar el código',
            true
          );

        }

      });

  }


  // =====================================================
  // VERIFICAR CÓDIGO
  // =====================================================

  verificarCodigo(): void {

    if (
      !this.codigoRecuperacion.trim()
    ) {

      this.mostrarMensaje(
        'Ingrese el código',
        true
      );

      return;

    }


    this.http
      .post<any>(
        `${this.API}/recuperar-password/verificar/`,
        {

          correo:
            this.correoRecuperacion.trim(),

          codigo:
            this.codigoRecuperacion.trim()

        }
      )
      .subscribe({


        next: respuesta => {

          if (
            respuesta.estado
          ) {

            this.pasoRecuperacion =
              3;

            this.mostrarMensaje(
              '',
              false
            );

          }

        },


        error: error => {

          this.mostrarMensaje(
            error.error?.mensaje
            ||
            'Código incorrecto',
            true
          );

        }

      });

  }


  // =====================================================
  // NUEVA CONTRASEÑA
  // =====================================================

  cambiarPassword(): void {

    if (
      !this.nuevaPassword
      ||
      !this.confirmarNuevaPassword
    ) {

      this.mostrarMensaje(
        'Complete las contraseñas',
        true
      );

      return;

    }


    if (
      this.nuevaPassword.length < 6
    ) {

      this.mostrarMensaje(
        'La contraseña debe tener al menos 6 caracteres',
        true
      );

      return;

    }


    if (
      this.nuevaPassword
      !==
      this.confirmarNuevaPassword
    ) {

      this.mostrarMensaje(
        'Las contraseñas no coinciden',
        true
      );

      return;

    }


    this.http
      .post<any>(
        `${this.API}/recuperar-password/cambiar/`,
        {

          correo:
            this.correoRecuperacion.trim(),

          password:
            this.nuevaPassword

        }
      )
      .subscribe({


        next: respuesta => {

          if (
            respuesta.estado
          ) {

            this.pasoRecuperacion =
              4;

            this.mostrarMensaje(
              '',
              false
            );

          }

        },


        error: error => {

          this.mostrarMensaje(
            error.error?.mensaje
            ||
            'No se pudo cambiar la contraseña',
            true
          );

        }

      });

  }


  volverLogin(): void {

    this.mostrarRecuperacion =
      false;

    this.password =
      '';

  }


  private mostrarMensaje(
    mensaje: string,
    error: boolean
  ): void {

    this.mensajeRecuperacion =
      mensaje;

    this.mensajeError =
      error;

  }

}
