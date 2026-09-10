from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import UsuarioSistema
import json

# ============================================================
# REGISTRO DE USUARIO
# ============================================================
@csrf_exempt
def registro(request):

    if request.method != "POST":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    try:

        datos = json.loads(request.body)

        nombre = datos.get("nombre", "").strip()
        usuario = datos.get("usuario", "").strip()
        correo = datos.get("correo", "").strip()
        password = datos.get("password", "").strip()


        # ====================================================
        # VALIDAR CAMPOS
        # ====================================================

        if not nombre or not usuario or not correo or not password:

            return JsonResponse({
                "estado": False,
                "mensaje": "Todos los campos son obligatorios"
            }, status=400)


        # ====================================================
        # VERIFICAR USUARIO EXISTENTE
        # ====================================================

        if UsuarioSistema.objects.filter(
            usuario=usuario
        ).exists():

            return JsonResponse({
                "estado": False,
                "mensaje": "El usuario ya existe"
            }, status=400)


        # ====================================================
        # VERIFICAR CORREO EXISTENTE
        # ====================================================

        if UsuarioSistema.objects.filter(
            correo=correo
        ).exists():

            return JsonResponse({
                "estado": False,
                "mensaje": "El correo ya existe"
            }, status=400)


        # ====================================================
        # ASIGNAR ROL AUTOMÁTICAMENTE
        # ====================================================

        if not UsuarioSistema.objects.exists():

            # Primera cuenta del sistema
            rol = "Administrador"

        else:

            # Cuentas posteriores
            rol = "Farmacéutico"


        # ====================================================
        # CREAR USUARIO
        # ====================================================

        nuevo_usuario = UsuarioSistema(

            nombre=nombre,

            usuario=usuario,

            correo=correo,

            password=password,

            rol=rol,

            estado=True

        )

        nuevo_usuario.save()


        # ====================================================
        # RESPUESTA
        # ====================================================

        return JsonResponse({

            "estado": True,

            "mensaje": "Usuario registrado correctamente",

            "usuario": {

                "id": nuevo_usuario.id,

                "nombre": nuevo_usuario.nombre,

                "usuario": nuevo_usuario.usuario,

                "correo": nuevo_usuario.correo,

                "rol": nuevo_usuario.rol,

                "estado": nuevo_usuario.estado,

                "fecha_registro":
                    nuevo_usuario.fecha_registro

            }

        }, status=201)


    except json.JSONDecodeError:

        return JsonResponse({

            "estado": False,

            "mensaje":
                "Los datos enviados no tienen un formato JSON válido"

        }, status=400)


    except Exception as e:

        return JsonResponse({

            "estado": False,

            "mensaje":
                "Error al registrar el usuario",

            "error":
                str(e)

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
        datos = json.loads(request.body)

        usuario = datos.get("usuario", "").strip()
        password = datos.get("password", "").strip()

        if not usuario or not password:
            return JsonResponse({
                "estado": False,
                "mensaje": "Debe ingresar usuario y contraseña"
            }, status=400)

        try:

            usuario_bd = UsuarioSistema.objects.get(
                usuario=usuario
            )

            # Verificar estado
            if not usuario_bd.estado:
                return JsonResponse({
                    "estado": False,
                    "mensaje": "El usuario se encuentra inactivo"
                }, status=403)

            # Verificar contraseña
            if usuario_bd.password != password:
                return JsonResponse({
                    "estado": False,
                    "mensaje": "Usuario o contraseña incorrectos"
                }, status=401)

            return JsonResponse({
                "estado": True,
                "mensaje": "Bienvenido",
                "usuario": {
                    "id": usuario_bd.id,
                    "nombre": usuario_bd.nombre,
                    "usuario": usuario_bd.usuario,
                    "correo": usuario_bd.correo,
                    "rol": usuario_bd.rol,
                    "estado": usuario_bd.estado,
                    "fecha_registro": usuario_bd.fecha_registro
                }
            })

        except UsuarioSistema.DoesNotExist:

            return JsonResponse({
                "estado": False,
                "mensaje": "Usuario o contraseña incorrectos"
            }, status=401)

    except json.JSONDecodeError:

        return JsonResponse({
            "estado": False,
            "mensaje": "Los datos enviados no tienen un formato JSON válido"
        }, status=400)

    except Exception as e:

        return JsonResponse({
            "estado": False,
            "mensaje": "Error al iniciar sesión",
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
            "mensaje": "Método no permitido"
        }, status=405)

    usuarios = UsuarioSistema.objects.all().order_by("-fecha_registro")

    lista = []

    for usuario in usuarios:

        lista.append({
            "id": usuario.id,
            "nombre": usuario.nombre,
            "usuario": usuario.usuario,
            "correo": usuario.correo,
            "rol": usuario.rol,
            "estado": usuario.estado,
            "fecha_registro": usuario.fecha_registro
        })

    return JsonResponse({
        "estado": True,
        "usuarios": lista
    })


# ============================================================
# OBTENER UN USUARIO
# ============================================================

@csrf_exempt
def obtener_usuario(request, id):

    if request.method != "GET":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    try:

        usuario = UsuarioSistema.objects.get(id=id)

        return JsonResponse({
            "estado": True,
            "usuario": {
                "id": usuario.id,
                "nombre": usuario.nombre,
                "usuario": usuario.usuario,
                "correo": usuario.correo,
                "rol": usuario.rol,
                "estado": usuario.estado,
                "fecha_registro": usuario.fecha_registro
            }
        })

    except UsuarioSistema.DoesNotExist:

        return JsonResponse({
            "estado": False,
            "mensaje": "Usuario no encontrado"
        }, status=404)


# ============================================================
# ACTUALIZAR USUARIO
# ============================================================

@csrf_exempt
def actualizar_usuario(request, id):

    if request.method != "PUT":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    try:

        usuario = UsuarioSistema.objects.get(id=id)

        datos = json.loads(request.body)

        nombre = datos.get("nombre", usuario.nombre).strip()
        nuevo_usuario = datos.get(
            "usuario",
            usuario.usuario
        ).strip()

        correo = datos.get(
            "correo",
            usuario.correo
        ).strip()

        rol = datos.get(
            "rol",
            usuario.rol
        ).strip()

        estado = datos.get(
            "estado",
            usuario.estado
        )

        # Verificar usuario duplicado
        if UsuarioSistema.objects.filter(
            usuario=nuevo_usuario
        ).exclude(id=id).exists():

            return JsonResponse({
                "estado": False,
                "mensaje": "El nombre de usuario ya está registrado"
            }, status=400)

        # Verificar correo duplicado
        if UsuarioSistema.objects.filter(
            correo=correo
        ).exclude(id=id).exists():

            return JsonResponse({
                "estado": False,
                "mensaje": "El correo ya está registrado"
            }, status=400)

        # Validar rol
        if rol not in [
            "Administrador",
            "Farmacéutico"
        ]:

            return JsonResponse({
                "estado": False,
                "mensaje": "El rol seleccionado no es válido"
            }, status=400)

        usuario.nombre = nombre
        usuario.usuario = nuevo_usuario
        usuario.correo = correo
        usuario.rol = rol
        usuario.estado = estado

        # Actualizar contraseña solamente si se envía
        password = datos.get("password")

        if password:
            usuario.password = password.strip()

        usuario.save()

        return JsonResponse({
            "estado": True,
            "mensaje": "Usuario actualizado correctamente",
            "usuario": {
                "id": usuario.id,
                "nombre": usuario.nombre,
                "usuario": usuario.usuario,
                "correo": usuario.correo,
                "rol": usuario.rol,
                "estado": usuario.estado
            }
        })

    except UsuarioSistema.DoesNotExist:

        return JsonResponse({
            "estado": False,
            "mensaje": "Usuario no encontrado"
        }, status=404)

    except json.JSONDecodeError:

        return JsonResponse({
            "estado": False,
            "mensaje": "Los datos enviados no tienen un formato JSON válido"
        }, status=400)


# ============================================================
# ACTIVAR / DESACTIVAR USUARIO
# ============================================================

@csrf_exempt
def cambiar_estado(request, id):

    if request.method != "PUT":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    try:

        usuario = UsuarioSistema.objects.get(id=id)

        usuario.estado = not usuario.estado

        usuario.save()

        return JsonResponse({
            "estado": True,
            "mensaje": "Estado del usuario actualizado",
            "usuario": {
                "id": usuario.id,
                "nombre": usuario.nombre,
                "estado": usuario.estado
            }
        })

    except UsuarioSistema.DoesNotExist:

        return JsonResponse({
            "estado": False,
            "mensaje": "Usuario no encontrado"
        }, status=404)


# ============================================================
# ELIMINAR USUARIO
# ============================================================

@csrf_exempt
def eliminar_usuario(request, id):

    if request.method != "DELETE":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    try:

        usuario = UsuarioSistema.objects.get(id=id)

        usuario.delete()

        return JsonResponse({
            "estado": True,
            "mensaje": "Usuario eliminado correctamente"
        })

    except UsuarioSistema.DoesNotExist:

        return JsonResponse({
            "estado": False,
            "mensaje": "Usuario no encontrado"
        }, status=404)