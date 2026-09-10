from django.contrib import admin
from django.urls import path, include
from usuarios_sistema.views import login
from django.urls import path, include

urlpatterns = [

   

    path(
        "admin/",
        admin.site.urls
    ),

    # LOGIN
    path(
        "api/usuarios-sistema/login/",
        login,
        name="login"
    ),

    path(
        "api/usuarios/",
        include("usuarios.urls")
    ),

    path(
        "api/usuarios-sistema/",
        include("usuarios_sistema.urls")
    ),

    path(
        "api/medicamentos/",
        include("medicamentos.urls")
    ),

    path(
        "api/compras/",
        include("compras.urls")
    ),

    path(
        "api/ventas/",
        include("ventas.urls")
    ),

    path(
        "api/inventario/",
        include("inventario.urls")
    ),

    path(
        "api/reportes/",
        include("reportes.urls")
    ),

    path(
        "api/alertas/",
        include("alertas.urls")
    ),

    path(
        "api/blockchain/",
        include("blockchain.urls")
    ),

]