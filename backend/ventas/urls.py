from django.urls import path

from .views import (
    listar_ventas,
    registrar_venta,
    anular_venta,
    obtener_venta,
    dashboard_ventas,
    registros_blockchain
)


urlpatterns = [

    # LISTAR VENTAS
    path(
        "",
        listar_ventas
    ),

    # REGISTRAR / CORREGIR VENTA
    path(
        "registrar/",
        registrar_venta
    ),

    # ANULAR VENTA
    path(
        "anular/<int:id>/",
        anular_venta
    ),

    # DETALLE DE VENTA
    path(
        "detalle/<int:id>/",
        obtener_venta
    ),

    # DASHBOARD
    path(
        "dashboard/",
        dashboard_ventas
    ),

    # REGISTROS BLOCKCHAIN
    path(
        "blockchain/",
        registros_blockchain
    ),
]