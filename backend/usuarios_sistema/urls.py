from django.urls import path

from .views import (
    registro,
    login,
    listar_usuarios,
    obtener_usuario,
    actualizar_usuario,
    cambiar_estado,
    eliminar_usuario,
)


urlpatterns = [

    # ==========================================
    # AUTENTICACIÓN
    # ==========================================

    path(
        "registro/",
        registro,
        name="registro_usuario_sistema"
    ),

    path(
        "login/",
        login,
        name="login_usuario_sistema"
    ),

    # ==========================================
    # GESTIÓN DE USUARIOS
    # ==========================================

    path(
        "",
        listar_usuarios,
        name="listar_usuarios_sistema"
    ),

    path(
        "<int:id>/",
        obtener_usuario,
        name="obtener_usuario_sistema"
    ),

    path(
        "<int:id>/actualizar/",
        actualizar_usuario,
        name="actualizar_usuario_sistema"
    ),

    path(
        "<int:id>/estado/",
        cambiar_estado,
        name="cambiar_estado_usuario_sistema"
    ),

    path(
        "<int:id>/eliminar/",
        eliminar_usuario,
        name="eliminar_usuario_sistema"
    ),

]