from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import make_password, check_password
from django.core.cache import cache

from .models import UsuarioSistema

import json
import secrets


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================

def password_protegida(password):

    if not password:
        return False

    return password.startswith(
        (
            "pbkdf2_",
            "argon2$",
            "bcrypt$",
            "bcrypt_sha256$",
            "scrypt$",
        )
    )


def comprobar_password(usuario, password):

    # Contraseña ya cifrada
    if password_protegida(usuario.password):

        return check_password(
            password,
            usuario.password
        )


    # ==========================================
    # COMPATIBILIDAD CON USUARIOS ANTIGUOS
    # ==========================================

    correcta = (
        usuario.password == password
    )


    # Convertir automáticamente a contraseña segura
    if correcta:

        usuario.password = make_password(
            password
        )

        usuario.save(
            update_fields=["password"]
        )


    return correcta


# ============================================================
# REGISTRO
# ============================================================

@csrf_exempt
def registro(request):

    if request.method != "POST":

        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)


    try:

        datos = json.loads(
            request.body
        )


        nombre = datos.get(
            "nombre",
            ""
        ).strip()


        usuario = datos.get(
            "usuario",
            ""
        ).strip()


        correo = datos.get(
            "correo",
            ""
        ).strip().lower()


        password = datos.get(
            "password",
            ""
        ).strip()


        # ==========================================
        # VALIDACIONES
        # ==========================================

        if (
            not nombre
            or not usuario
            or not correo
            or not password
        ):

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Todos los campos son obligatorios"
            }, status=400)


        if len(password) < 6:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "La contraseña debe tener al menos 6 caracteres"
            }, status=400)


        # ==========================================
        # USUARIO EXISTENTE
        # ==========================================

        if UsuarioSistema.objects.filter(
            usuario=usuario
        ).exists():

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "El nombre de usuario ya existe"
            }, status=400)


        # ==========================================
        # CORREO EXISTENTE
        # ==========================================

        if UsuarioSistema.objects.filter(
            correo__iexact=correo
        ).exists():

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "El correo ya está registrado"
            }, status=400)


        # ==========================================
        # ROL
        # ==========================================

        if UsuarioSistema.objects.exists():

            rol = "Farmacéutico"

        else:

            rol = "Administrador"


        # ==========================================
        # CREAR USUARIO
        # ==========================================

        nuevo_usuario = UsuarioSistema(

            nombre=nombre,

            usuario=usuario,

            correo=correo,

            password=make_password(
                password
            ),

            rol=rol,

            estado=True
        )


        nuevo_usuario.save()


        return JsonResponse({

            "estado": True,

            "mensaje":
                "Usuario registrado correctamente",

            "usuario": {

                "id":
                    nuevo_usuario.id,

                "nombre":
                    nuevo_usuario.nombre,

                "usuario":
                    nuevo_usuario.usuario,

                "correo":
                    nuevo_usuario.correo,

                "rol":
                    nuevo_usuario.rol,

                "estado":
                    nuevo_usuario.estado,

                "fecha_registro":
                    nuevo_usuario.fecha_registro
            }

        }, status=201)


    except json.JSONDecodeError:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Formato JSON inválido"
        }, status=400)


    except Exception as e:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Error al registrar usuario",
            "error": str(e)
        }, status=500)


# ============================================================
# LOGIN
# ============================================================

@csrf_exempt
def login(request):

    if request.method != "POST":

        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)


    try:

        datos = json.loads(
            request.body
        )


        usuario = datos.get(
            "usuario",
            ""
        ).strip()


        password = datos.get(
            "password",
            ""
        ).strip()


        if not usuario or not password:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Debe ingresar usuario y contraseña"
            }, status=400)


        try:

            usuario_bd = (
                UsuarioSistema
                .objects
                .get(
                    usuario=usuario
                )
            )


        except UsuarioSistema.DoesNotExist:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Usuario o contraseña incorrectos"
            }, status=401)


        # ==========================================
        # ESTADO
        # ==========================================

        if not usuario_bd.estado:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "El usuario se encuentra inactivo"
            }, status=403)


        # ==========================================
        # PASSWORD
        # ==========================================

        if not comprobar_password(
            usuario_bd,
            password
        ):

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Usuario o contraseña incorrectos"
            }, status=401)


        return JsonResponse({

            "estado": True,

            "mensaje":
                "Bienvenido",

            "usuario": {

                "id":
                    usuario_bd.id,

                "nombre":
                    usuario_bd.nombre,

                "usuario":
                    usuario_bd.usuario,

                "correo":
                    usuario_bd.correo,

                "rol":
                    usuario_bd.rol,

                "estado":
                    usuario_bd.estado,

                "fecha_registro":
                    usuario_bd.fecha_registro
            }

        })


    except json.JSONDecodeError:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Formato JSON inválido"
        }, status=400)


    except Exception as e:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Error al iniciar sesión",
            "error": str(e)
        }, status=500)


# ============================================================
# RECUPERACIÓN - GENERAR CÓDIGO
# ============================================================

@csrf_exempt
def solicitar_recuperacion(request):

    if request.method != "POST":

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Método no permitido"
        }, status=405)


    try:

        datos = json.loads(
            request.body
        )


        correo = datos.get(
            "correo",
            ""
        ).strip().lower()


        if not correo:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Ingrese su correo electrónico"
            }, status=400)


        # ==========================================
        # BUSCAR USUARIO
        # ==========================================

        try:

            usuario = (
                UsuarioSistema
                .objects
                .get(
                    correo__iexact=correo
                )
            )


        except UsuarioSistema.DoesNotExist:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "El correo no está registrado"
            }, status=404)


        # ==========================================
        # GENERAR CÓDIGO
        # ==========================================

        codigo = str(
            secrets.randbelow(
                900000
            )
            +
            100000
        )


        # ==========================================
        # GUARDAR 5 MINUTOS
        # ==========================================

        cache.set(
            f"farmacor_codigo_{correo}",
            codigo,
            timeout=300
        )


        cache.delete(
            f"farmacor_verificado_{correo}"
        )


        # ==========================================
        # RESPUESTA
        # ==========================================

        return JsonResponse({

            "estado": True,

            "mensaje":
                "Código generado correctamente",

            "codigo":
                codigo,

            "nombre":
                usuario.nombre

        })


    except json.JSONDecodeError:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Formato JSON inválido"
        }, status=400)


    except Exception as e:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Error al generar el código",
            "error": str(e)
        }, status=500)


# ============================================================
# RECUPERACIÓN - VERIFICAR CÓDIGO
# ============================================================

@csrf_exempt
def verificar_codigo_recuperacion(request):

    if request.method != "POST":

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Método no permitido"
        }, status=405)


    try:

        datos = json.loads(
            request.body
        )


        correo = datos.get(
            "correo",
            ""
        ).strip().lower()


        codigo = datos.get(
            "codigo",
            ""
        ).strip()


        if not correo or not codigo:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Ingrese el código"
            }, status=400)


        codigo_guardado = cache.get(
            f"farmacor_codigo_{correo}"
        )


        if not codigo_guardado:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "El código expiró. Genere uno nuevo."
            }, status=400)


        if str(codigo_guardado) != str(codigo):

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Código incorrecto"
            }, status=400)


        # ==========================================
        # MARCAR COMO VERIFICADO
        # ==========================================

        cache.set(
            f"farmacor_verificado_{correo}",
            True,
            timeout=300
        )


        return JsonResponse({
            "estado": True,
            "mensaje":
                "Código verificado correctamente"
        })


    except Exception as e:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Error al verificar código",
            "error": str(e)
        }, status=500)


# ============================================================
# RECUPERACIÓN - NUEVA CONTRASEÑA
# ============================================================

@csrf_exempt
def cambiar_password_recuperacion(request):

    if request.method != "POST":

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Método no permitido"
        }, status=405)


    try:

        datos = json.loads(
            request.body
        )


        correo = datos.get(
            "correo",
            ""
        ).strip().lower()


        password = datos.get(
            "password",
            ""
        ).strip()


        if not correo or not password:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Ingrese la nueva contraseña"
            }, status=400)


        if len(password) < 6:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "La contraseña debe tener al menos 6 caracteres"
            }, status=400)


        # ==========================================
        # VERIFICAR QUE EL CÓDIGO FUE VALIDADO
        # ==========================================

        verificado = cache.get(
            f"farmacor_verificado_{correo}"
        )


        if not verificado:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Primero debe verificar el código"
            }, status=403)


        # ==========================================
        # BUSCAR USUARIO
        # ==========================================

        try:

            usuario = (
                UsuarioSistema
                .objects
                .get(
                    correo__iexact=correo
                )
            )


        except UsuarioSistema.DoesNotExist:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Usuario no encontrado"
            }, status=404)


        # ==========================================
        # CAMBIAR CONTRASEÑA
        # ==========================================

        usuario.password = make_password(
            password
        )


        usuario.save(
            update_fields=["password"]
        )


        # ==========================================
        # LIMPIAR CÓDIGO
        # ==========================================

        cache.delete(
            f"farmacor_codigo_{correo}"
        )


        cache.delete(
            f"farmacor_verificado_{correo}"
        )


        return JsonResponse({
            "estado": True,
            "mensaje":
                "Contraseña actualizada correctamente"
        })


    except Exception as e:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Error al cambiar contraseña",
            "error": str(e)
        }, status=500)


# ============================================================
# LISTAR USUARIOS
# ============================================================

@csrf_exempt
def listar_usuarios(request):

    if request.method != "GET":

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Método no permitido"
        }, status=405)


    usuarios = (
        UsuarioSistema
        .objects
        .all()
        .order_by(
            "-fecha_registro"
        )
    )


    lista = []


    for usuario in usuarios:

        lista.append({

            "id":
                usuario.id,

            "nombre":
                usuario.nombre,

            "usuario":
                usuario.usuario,

            "correo":
                usuario.correo,

            "rol":
                usuario.rol,

            "estado":
                usuario.estado,

            "fecha_registro":
                usuario.fecha_registro

        })


    return JsonResponse({
        "estado": True,
        "usuarios": lista
    })


# ============================================================
# OBTENER USUARIO
# ============================================================

@csrf_exempt
def obtener_usuario(request, id):

    if request.method != "GET":

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Método no permitido"
        }, status=405)


    try:

        usuario = (
            UsuarioSistema
            .objects
            .get(
                id=id
            )
        )


        return JsonResponse({

            "estado": True,

            "usuario": {

                "id":
                    usuario.id,

                "nombre":
                    usuario.nombre,

                "usuario":
                    usuario.usuario,

                "correo":
                    usuario.correo,

                "rol":
                    usuario.rol,

                "estado":
                    usuario.estado,

                "fecha_registro":
                    usuario.fecha_registro

            }

        })


    except UsuarioSistema.DoesNotExist:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Usuario no encontrado"
        }, status=404)


# ============================================================
# ACTUALIZAR USUARIO
# ============================================================

@csrf_exempt
def actualizar_usuario(request, id):

    if request.method != "PUT":

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Método no permitido"
        }, status=405)


    try:

        usuario = (
            UsuarioSistema
            .objects
            .get(
                id=id
            )
        )


        datos = json.loads(
            request.body
        )


        nombre = datos.get(
            "nombre",
            usuario.nombre
        ).strip()


        nuevo_usuario = datos.get(
            "usuario",
            usuario.usuario
        ).strip()


        correo = datos.get(
            "correo",
            usuario.correo
        ).strip().lower()


        rol = datos.get(
            "rol",
            usuario.rol
        ).strip()


        estado = datos.get(
            "estado",
            usuario.estado
        )


        # ==========================================
        # USUARIO REPETIDO
        # ==========================================

        if (
            UsuarioSistema
            .objects
            .filter(
                usuario=nuevo_usuario
            )
            .exclude(
                id=id
            )
            .exists()
        ):

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "El usuario ya está registrado"
            }, status=400)


        # ==========================================
        # CORREO REPETIDO
        # ==========================================

        if (
            UsuarioSistema
            .objects
            .filter(
                correo__iexact=correo
            )
            .exclude(
                id=id
            )
            .exists()
        ):

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "El correo ya está registrado"
            }, status=400)


        # ==========================================
        # ROL
        # ==========================================

        if rol not in [
            "Administrador",
            "Farmacéutico"
        ]:

            return JsonResponse({
                "estado": False,
                "mensaje":
                    "Rol no válido"
            }, status=400)


        usuario.nombre = nombre

        usuario.usuario = nuevo_usuario

        usuario.correo = correo

        usuario.rol = rol

        usuario.estado = estado


        # ==========================================
        # PASSWORD OPCIONAL
        # ==========================================

        password = datos.get(
            "password",
            ""
        ).strip()


        if password:

            if len(password) < 6:

                return JsonResponse({
                    "estado": False,
                    "mensaje":
                        "La contraseña debe tener al menos 6 caracteres"
                }, status=400)


            usuario.password = make_password(
                password
            )


        usuario.save()


        return JsonResponse({

            "estado": True,

            "mensaje":
                "Usuario actualizado correctamente",

            "usuario": {

                "id":
                    usuario.id,

                "nombre":
                    usuario.nombre,

                "usuario":
                    usuario.usuario,

                "correo":
                    usuario.correo,

                "rol":
                    usuario.rol,

                "estado":
                    usuario.estado

            }

        })


    except UsuarioSistema.DoesNotExist:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Usuario no encontrado"
        }, status=404)


    except json.JSONDecodeError:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Formato JSON inválido"
        }, status=400)


# ============================================================
# CAMBIAR ESTADO
# ============================================================

@csrf_exempt
def cambiar_estado(request, id):

    if request.method != "PUT":

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Método no permitido"
        }, status=405)


    try:

        usuario = (
            UsuarioSistema
            .objects
            .get(
                id=id
            )
        )


        usuario.estado = (
            not usuario.estado
        )


        usuario.save(
            update_fields=["estado"]
        )


        return JsonResponse({

            "estado": True,

            "mensaje":
                "Estado actualizado correctamente",

            "usuario": {

                "id":
                    usuario.id,

                "nombre":
                    usuario.nombre,

                "estado":
                    usuario.estado

            }

        })


    except UsuarioSistema.DoesNotExist:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Usuario no encontrado"
        }, status=404)


# ============================================================
# ELIMINAR USUARIO
# ============================================================

@csrf_exempt
def eliminar_usuario(request, id):

    if request.method != "DELETE":

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Método no permitido"
        }, status=405)


    try:

        usuario = (
            UsuarioSistema
            .objects
            .get(
                id=id
            )
        )


        usuario.delete()


        return JsonResponse({
            "estado": True,
            "mensaje":
                "Usuario eliminado correctamente"
        })


    except UsuarioSistema.DoesNotExist:

        return JsonResponse({
            "estado": False,
            "mensaje":
                "Usuario no encontrado"
        }, status=404)