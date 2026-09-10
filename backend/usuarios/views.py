from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Usuario
import json


@csrf_exempt
def registro(request):

    if request.method == "POST":

        datos = json.loads(request.body)

        nombre = datos.get("nombre")
        usuario = datos.get("usuario")
        correo = datos.get("correo")
        password = datos.get("password")

        if Usuario.objects.filter(usuario=usuario).exists():
            return JsonResponse({
                "estado": False,
                "mensaje": "El usuario ya existe"
            })

        if Usuario.objects.filter(correo=correo).exists():
            return JsonResponse({
                "estado": False,
                "mensaje": "El correo ya existe"
            })

        nuevo = Usuario(
            nombre=nombre,
            usuario=usuario,
            correo=correo,
            password=password
        )

        nuevo.save()

        return JsonResponse({
            "estado": True,
            "mensaje": "Usuario registrado correctamente"
        })

    return JsonResponse({
        "estado": False
    })


@csrf_exempt
def login(request):

    if request.method == "POST":

        datos = json.loads(request.body)

        usuario = datos.get("usuario")
        password = datos.get("password")

        try:

            usuario_bd = Usuario.objects.get(
                usuario=usuario,
                password=password
            )

            return JsonResponse({

                "estado": True,
                "mensaje": "Bienvenido",

                "usuario":{

                    "id":usuario_bd.id,
                    "nombre":usuario_bd.nombre,
                    "usuario":usuario_bd.usuario,
                    "correo":usuario_bd.correo

                }

            })

        except Usuario.DoesNotExist:

            return JsonResponse({

                "estado":False,
                "mensaje":"Usuario o contraseña incorrectos"

            })

    return JsonResponse({
        "estado": False
    })