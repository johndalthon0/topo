from django.urls import path

from .views import (
    listar_compras,
    registrar_compra,
    dashboard_entradas,
    detalle_compra,
    anular_compra,
    listar_registros_blockchain
)


urlpatterns = [

    # ========================================================
    # LISTAR COMPRAS
    # ========================================================

    path(
        "",
        listar_compras
    ),


    # ========================================================
    # REGISTRAR COMPRA
    # ========================================================

    path(
        "registrar/",
        registrar_compra
    ),


    # ========================================================
    # ANULAR COMPRA
    # ========================================================

    path(
        "anular/<int:id>/",
        anular_compra
    ),


    # ========================================================
    # DETALLE
    # ========================================================

    path(
        "detalle/<int:id>/",
        detalle_compra
    ),


    # ========================================================
    # DASHBOARD
    # ========================================================

    path(
        "dashboard/",
        dashboard_entradas
    ),


    # ========================================================
    # HISTORIAL BLOCKCHAIN
    # ========================================================

    path(
        "registros-blockchain/",
        listar_registros_blockchain
    ),

]