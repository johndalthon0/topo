import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  HttpClient,
  HttpClientModule
} from '@angular/common/http';
import { environment } from '../../environments/environment';


interface Usuario {

  id: number;

  usuario: string;

  nombre: string;

  correo: string;

  password?: string;

  rol: string;

  estado: boolean;

  fecha_registro?: string;

}


@Component({

  selector: 'app-usuarios',

  standalone: true,

  imports: [

    CommonModule,

    FormsModule,

    HttpClientModule

  ],

  templateUrl: './usuarios.component.html',

  styleUrl: './usuarios.component.css'

})


export class UsuariosComponent implements OnInit {


  // ============================================================
  // URL DEL BACKEND DJANGO
  // IMPORTANTE: SIN "/" AL FINAL
  // ============================================================

  private apiUrl =
    `${environment.apiUrl}/api/usuarios-sistema`;


  // ============================================================
  // BUSCADOR
  // ============================================================

  busqueda = '';


  // ============================================================
  // MODAL
  // ============================================================

  mostrarFormulario = false;

  modoEdicion = false;


  // ============================================================
  // ESTADO DE CARGA
  // ============================================================

  cargando = false;


  // ============================================================
  // MENSAJES
  // Se utilizan en lugar de alert()
  // para evitar el error "alert is not defined"
  // ============================================================

  mensaje = '';

  tipoMensaje:
    'exito' |
    'error' |
    'info' = 'info';


  // ============================================================
  // LISTA DE USUARIOS
  // ============================================================

  usuarios: Usuario[] = [];


  // ============================================================
  // FORMULARIO
  // ============================================================

  usuarioForm: Usuario = {

    id: 0,

    usuario: '',

    nombre: '',

    correo: '',

    password: '',

    rol: 'Farmacéutico',

    estado: true,

    fecha_registro: ''

  };


  // ============================================================
  // CONSTRUCTOR
  // ============================================================

  constructor(

    private http: HttpClient

  ) {}


  // ============================================================
  // INICIALIZAR COMPONENTE
  // ============================================================

  ngOnInit(): void {

    this.cargarUsuarios();

  }


  // ============================================================
  // MOSTRAR MENSAJE
  // ============================================================

  mostrarMensaje(

    texto: string,

    tipo:
      'exito' |
      'error' |
      'info' = 'info'

  ): void {

    this.mensaje = texto;

    this.tipoMensaje = tipo;


    setTimeout(() => {

      this.mensaje = '';

    }, 4000);

  }


  // ============================================================
  // OBTENER MENSAJE DE ERROR DEL BACKEND
  // ============================================================

  obtenerMensajeError(

    error: any,

    mensajePredeterminado: string

  ): string {

    if (

      error &&

      error.error &&

      error.error.mensaje

    ) {

      return error.error.mensaje;

    }


    if (

      error &&

      error.status === 0

    ) {

      return (

        'No se pudo conectar con Django. ' +

        'Verifique que el servidor esté ejecutándose.'

      );

    }


    return mensajePredeterminado;

  }


  // ============================================================
  // LISTAR USUARIOS DESDE DJANGO
  // GET
  // /api/usuarios-sistema/
  // ============================================================

  cargarUsuarios(): void {

    this.cargando = true;


    this.http.get<any>(

      `${this.apiUrl}/`

    ).subscribe({

      next: (respuesta) => {


        if (

          respuesta &&

          respuesta.estado

        ) {


          this.usuarios =

            respuesta.usuarios || [];


        }

        else {


          this.usuarios = [];


          this.mostrarMensaje(

            respuesta?.mensaje ||

            'No se pudieron cargar los usuarios.',

            'error'

          );

        }


        this.cargando = false;

      },


      error: (error) => {


        console.error(

          'Error al cargar usuarios:',

          error

        );


        this.cargando = false;


        this.mostrarMensaje(

          this.obtenerMensajeError(

            error,

            'No se pudo cargar la lista de usuarios.'

          ),

          'error'

        );

      }

    });

  }


  // ============================================================
  // USUARIOS FILTRADOS
  // ============================================================

  get usuariosFiltrados(): Usuario[] {


    const texto =

      this.busqueda

        .toLowerCase()

        .trim();


    if (!texto) {

      return this.usuarios;

    }


    return this.usuarios.filter(

      usuario =>


        usuario.usuario

          .toLowerCase()

          .includes(texto)


        ||


        usuario.nombre

          .toLowerCase()

          .includes(texto)


        ||


        usuario.correo

          .toLowerCase()

          .includes(texto)


        ||


        usuario.rol

          .toLowerCase()

          .includes(texto)

    );

  }


  // ============================================================
  // USUARIOS ACTIVOS
  // ============================================================

  get usuariosActivos(): number {


    return this.usuarios.filter(

      usuario =>

        usuario.estado === true

    ).length;

  }


  // ============================================================
  // ADMINISTRADORES
  // ============================================================

  get administradores(): number {


    return this.usuarios.filter(

      usuario =>

        usuario.rol ===

        'Administrador'

    ).length;

  }


  // ============================================================
  // FARMACÉUTICOS
  // ============================================================

  get farmaceuticos(): number {


    return this.usuarios.filter(

      usuario =>

        usuario.rol ===

        'Farmacéutico'

    ).length;

  }


  // ============================================================
  // ABRIR FORMULARIO PARA NUEVO USUARIO
  // ============================================================

  abrirFormulario(): void {


    this.modoEdicion = false;


    this.mensaje = '';


    this.usuarioForm = {


      id: 0,


      usuario: '',


      nombre: '',


      correo: '',


      password: '',


      rol: 'Farmacéutico',


      estado: true,


      fecha_registro: ''

    };


    this.mostrarFormulario = true;

  }


  // ============================================================
  // CERRAR FORMULARIO
  // ============================================================

  cerrarFormulario(): void {


    this.mostrarFormulario = false;


    this.mensaje = '';

  }


  // ============================================================
  // EDITAR USUARIO
  // ============================================================

  editarUsuario(

    usuario: Usuario

  ): void {


    this.modoEdicion = true;


    this.mensaje = '';


    this.usuarioForm = {


      ...usuario,


      password: ''

    };


    this.mostrarFormulario = true;

  }


  // ============================================================
  // GUARDAR O ACTUALIZAR USUARIO
  // ============================================================

  guardarUsuario(): void {


    // ==========================================================
    // VALIDAR CAMPOS OBLIGATORIOS
    // ==========================================================


    if (


      !this.usuarioForm.usuario ||


      !this.usuarioForm.nombre ||


      !this.usuarioForm.correo

    ) {


      this.mostrarMensaje(

        'Complete los campos obligatorios.',

        'error'

      );


      return;

    }


    // ==========================================================
    // VALIDAR CONTRASEÑA PARA NUEVO USUARIO
    // ==========================================================


    if (


      !this.modoEdicion &&


      !this.usuarioForm.password

    ) {


      this.mostrarMensaje(

        'Ingrese una contraseña para el usuario.',

        'error'

      );


      return;

    }


    // ==========================================================
    // EDITAR USUARIO
    // ==========================================================


    if (this.modoEdicion) {


      const datosActualizar: any = {


        nombre:

          this.usuarioForm.nombre,


        usuario:

          this.usuarioForm.usuario,


        correo:

          this.usuarioForm.correo,


        rol:

          this.usuarioForm.rol,


        estado:

          this.usuarioForm.estado

      };


      // ========================================================
      // ACTUALIZAR CONTRASEÑA SOLO SI SE INGRESA
      // ========================================================


      if (

        this.usuarioForm.password &&

        this.usuarioForm.password.trim()

      ) {


        datosActualizar.password =

          this.usuarioForm.password;

      }


      this.cargando = true;


      this.http.put<any>(


        `${this.apiUrl}/${this.usuarioForm.id}/actualizar/`,


        datosActualizar


      ).subscribe({


        next: (respuesta) => {


          this.cargando = false;


          if (

            respuesta &&

            respuesta.estado

          ) {


            this.cerrarFormulario();


            this.mostrarMensaje(

              'Usuario actualizado correctamente.',

              'exito'

            );


            this.cargarUsuarios();

          }


          else {


            this.mostrarMensaje(

              respuesta?.mensaje ||

              'No se pudo actualizar el usuario.',

              'error'

            );

          }

        },


        error: (error) => {


          this.cargando = false;


          console.error(

            'Error al actualizar usuario:',

            error

          );


          this.mostrarMensaje(

            this.obtenerMensajeError(

              error,

              'No se pudo actualizar el usuario.'

            ),

            'error'

          );

        }

      });


      return;

    }


    // ============================================================
    // REGISTRAR NUEVO USUARIO
    // POST
    // /api/usuarios-sistema/registro/
    // ============================================================


    const nuevoUsuario = {


      nombre:

        this.usuarioForm.nombre,


      usuario:

        this.usuarioForm.usuario,


      correo:

        this.usuarioForm.correo,


      password:

        this.usuarioForm.password,


      rol:

        this.usuarioForm.rol

    };


    this.cargando = true;


    this.http.post<any>(


      `${this.apiUrl}/registro/`,


      nuevoUsuario


    ).subscribe({


      next: (respuesta) => {


        this.cargando = false;


        if (

          respuesta &&

          respuesta.estado

        ) {


          this.cerrarFormulario();


          this.mostrarMensaje(

            'Usuario registrado correctamente.',

            'exito'

          );


          this.cargarUsuarios();

        }


        else {


          this.mostrarMensaje(

            respuesta?.mensaje ||

            'No se pudo registrar el usuario.',

            'error'

          );

        }

      },


      error: (error) => {


        this.cargando = false;


        console.error(

          'Error al registrar usuario:',

          error

        );


        this.mostrarMensaje(

          this.obtenerMensajeError(

            error,

            'No se pudo registrar el usuario.'

          ),

          'error'

        );

      }

    });

  }


  // ============================================================
  // CAMBIAR ESTADO DEL USUARIO
  // PUT
  // /api/usuarios-sistema/{id}/estado/
  // ============================================================

  cambiarEstado(

    usuario: Usuario

  ): void {


    const nuevoEstado =

      !usuario.estado;


    this.cargando = true;


    this.http.put<any>(


      `${this.apiUrl}/${usuario.id}/estado/`,


      {}


    ).subscribe({


      next: (respuesta) => {


        this.cargando = false;


        if (

          respuesta &&

          respuesta.estado

        ) {


          this.mostrarMensaje(

            nuevoEstado

              ? 'Usuario activado correctamente.'

              : 'Usuario desactivado correctamente.',

            'exito'

          );


          this.cargarUsuarios();

        }


        else {


          this.mostrarMensaje(

            respuesta?.mensaje ||

            'No se pudo cambiar el estado.',

            'error'

          );

        }

      },


      error: (error) => {


        this.cargando = false;


        console.error(

          'Error al cambiar estado:',

          error

        );


        this.mostrarMensaje(

          this.obtenerMensajeError(

            error,

            'No se pudo cambiar el estado del usuario.'

          ),

          'error'

        );

      }

    });

  }


  // ============================================================
  // ELIMINAR USUARIO
  // DELETE
  // /api/usuarios-sistema/{id}/eliminar/
  // ============================================================

  eliminarUsuario(

    id: number

  ): void {


    this.cargando = true;


    this.http.delete<any>(


      `${this.apiUrl}/${id}/eliminar/`


    ).subscribe({


      next: (respuesta) => {


        this.cargando = false;


        if (

          respuesta &&

          respuesta.estado

        ) {


          this.mostrarMensaje(

            'Usuario eliminado correctamente.',

            'exito'

          );


          this.cargarUsuarios();

        }


        else {


          this.mostrarMensaje(

            respuesta?.mensaje ||

            'No se pudo eliminar el usuario.',

            'error'

          );

        }

      },


      error: (error) => {


        this.cargando = false;


        console.error(

          'Error al eliminar usuario:',

          error

        );


        this.mostrarMensaje(

          this.obtenerMensajeError(

            error,

            'No se pudo eliminar el usuario.'

          ),

          'error'

        );

      }

    });

  }


  // ============================================================
  // OBTENER INICIAL DEL USUARIO
  // ============================================================

  obtenerInicial(

    nombre: string

  ): string {


    if (!nombre) {


      return 'U';

    }


    return nombre

      .charAt(0)

      .toUpperCase();

  }


  // ============================================================
  // CONVERTIR ESTADO A TEXTO
  // ============================================================

  obtenerEstadoTexto(

    estado: boolean

  ): string {


    return estado

      ? 'Activo'

      : 'Inactivo';

  }


  // ============================================================
  // OBTENER CLASE CSS DEL ROL
  // ============================================================

  obtenerClaseRol(

    rol: string

  ): string {


    if (

      rol ===

      'Administrador'

    ) {


      return 'rol-admin';

    }


    return 'rol-empleado';

  }


  // ============================================================
  // OBTENER CLASE CSS DEL ESTADO
  // ============================================================

  obtenerClaseEstado(

    estado: boolean

  ): string {


    return estado

      ? 'activo'

      : 'inactivo';

  }


}
