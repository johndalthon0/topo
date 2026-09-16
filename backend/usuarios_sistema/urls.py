from django.urls import path

from .views import (
    registro,
    login,

    solicitar_recuperacion,
    verificar_codigo_recuperacion,
    cambiar_password_recuperacion,

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
        name="registro"
    ),

    path(
        "login/",
        login,
        name="login"
    ),


    # ==========================================
    # RECUPERAR CONTRASEÑA
    # ==========================================

    path(
        "recuperar-password/solicitar/",
        solicitar_recuperacion,
        name="solicitar_recuperacion"
    ),

    path(
        "recuperar-password/verificar/",
        verificar_codigo_recuperacion,
        name="verificar_codigo"
    ),

    path(
        "recuperar-password/cambiar/",
        cambiar_password_recuperacion,
        name="cambiar_password"
    ),


    # ==========================================
    # USUARIOS
    # ==========================================

    path(
        "",
        listar_usuarios,
        name="listar_usuarios"
    ),

    path(
        "<int:id>/",
        obtener_usuario,
        name="obtener_usuario"
    ),

    path(
        "<int:id>/actualizar/",
        actualizar_usuario,
        name="actualizar_usuario"
    ),

    path(
        "<int:id>/estado/",
        cambiar_estado,
        name="cambiar_estado"
    ),

    path(
        "<int:id>/eliminar/",
        eliminar_usuario,
        name="eliminar_usuario"
    ),

]