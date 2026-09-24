from django.views.decorators.csrf import csrf_exempt

from django.conf import settings

from django.http import JsonResponse

from django.shortcuts import get_object_or_404

from django.utils import timezone

from django.db import transaction


from .models import (
    Compra,
    DetalleCompra,
    Proveedor,
    RegistroBlockchain
)

from medicamentos.models import Medicamento


from decimal import Decimal

import json

import requests


# ============================================================
# CONFIGURACIÓN BLOCKCHAIN
# ============================================================

BLOCKCHAIN_URL = (
    f"{settings.BLOCKCHAIN_SERVICE_URL}/api/blockchain/registrar/"
)


# ============================================================
# ENVIAR OPERACIÓN A BLOCKCHAIN
# ============================================================

def enviar_a_blockchain(
    tipo_operacion,
    referencia,
    usuario,
    datos_operacion
):

    try:

        payload = {

            "tipoOperacion":
                tipo_operacion,

            "referencia":
                referencia,

            "usuario":
                usuario,

            "datosOperacion":
                datos_operacion

        }


        print(
            "=========================================="
        )

        print(
            "ENVIANDO A BLOCKCHAIN:"
        )

        print(
            payload
        )

        print(
            "=========================================="
        )


        respuesta = requests.post(

            BLOCKCHAIN_URL,

            json=payload,

            timeout=30

        )


        try:

            resultado = respuesta.json()

        except Exception:

            resultado = {

                "estado": False,

                "mensaje":
                    "Blockchain devolvió una respuesta inválida"

            }


        if respuesta.status_code >= 400:

            return {

                "estado": False,

                "mensaje":
                    "Error del servicio Blockchain",

                "detalle":
                    resultado

            }


        return resultado


    except Exception as error:

        print(
            "ERROR AL CONECTAR CON BLOCKCHAIN:",
            str(error)
        )


        return {

            "estado": False,

            "mensaje":
                "No se pudo conectar con Blockchain",

            "error":
                str(error)

        }


# ============================================================
# CREAR REGISTRO LOCAL DE BLOCKCHAIN
# ============================================================

def crear_registro_blockchain(

    compra,

    tipo_operacion,

    referencia,

    usuario,

    resultado_blockchain,

    referencia_original=None,

    motivo=None,

    estado_exito="VERIFICADO"

):

    blockchain_ok = bool(
        resultado_blockchain.get(
            "estado",
            False
        )
    )


    registro = RegistroBlockchain.objects.create(

        compra=compra,

        tipo_operacion=
            tipo_operacion,

        referencia=
            referencia,

        referencia_original=
            referencia_original,

        motivo=
            motivo,

        usuario=
            usuario,

        estado=(
            estado_exito
            if blockchain_ok
            else "NO_REGISTRADO"
        ),

        hash_operacion=
            resultado_blockchain.get(
                "hashOperacion"
            ),

        transaction_hash=
            resultado_blockchain.get(
                "transactionHash"
            ),

        block_number=
            resultado_blockchain.get(
                "blockNumber"
            ),

        cuenta_blockchain=
            resultado_blockchain.get(
                "cuentaBlockchain"
            )

    )


    return registro


# ============================================================
# LISTAR COMPRAS
# ============================================================

@csrf_exempt
def listar_compras(request):

    if request.method != "GET":

        return JsonResponse({

            "estado": False,

            "mensaje":
                "Método no permitido"

        }, status=405)


    compras = (
        Compra.objects
        .select_related(
            "proveedor",
            "compra_origen"
        )
        .all()
        .order_by("-id")
    )


    datos = []


    for compra in compras:

        correccion_activa = (
            compra.correcciones
            .exclude(
                estado="ANULADA"
            )
            .first()
        )


        datos.append({

            "id":
                compra.id,

            "proveedor":
                compra.proveedor.nombre,

            "fecha":
                str(compra.fecha),

            "factura":
                compra.factura,

            "total":
                float(compra.total),

            "estado":
                compra.estado,

            "observacion":
                compra.observacion,


            # ========================================
            # ANULACIÓN
            # ========================================

            "motivo_anulacion":
                compra.motivo_anulacion,

            "fecha_anulacion": (
                compra.fecha_anulacion.isoformat()
                if compra.fecha_anulacion
                else None
            ),

            "anulado_por":
                compra.anulado_por,


            # ========================================
            # CORRECCIÓN
            # ========================================

            "compra_origen_id": (
                compra.compra_origen.id
                if compra.compra_origen
                else None
            ),

            "compra_origen_factura": (
                compra.compra_origen.factura
                if compra.compra_origen
                else None
            ),

            "correccion_id": (
                correccion_activa.id
                if correccion_activa
                else None
            ),

            "correccion_factura": (
                correccion_activa.factura
                if correccion_activa
                else None
            ),


            # ========================================
            # PERMISOS PARA ANGULAR
            # ========================================

            "puede_anular":
                compra.estado != "ANULADA",

            "puede_corregir": (
                compra.estado == "ANULADA"
                and correccion_activa is None
            ),


            # ========================================
            # BLOCKCHAIN ORIGINAL
            # ========================================

            "hash_operacion":
                compra.hash_operacion,

            "transaction_hash":
                compra.transaction_hash,

            "block_number":
                compra.block_number,

            "cuenta_blockchain":
                compra.cuenta_blockchain,

            "estado_blockchain": (

                "Verificado"

                if (
                    compra.hash_operacion
                    and compra.transaction_hash
                    and compra.block_number
                )

                else "No registrado"

            )

        })


    return JsonResponse(
        datos,
        safe=False
    )


# ============================================================
# REGISTRAR COMPRA
# ============================================================

@csrf_exempt
def registrar_compra(request):

    if request.method != "POST":

        return JsonResponse({

            "estado": False,

            "mensaje":
                "Método no permitido"

        }, status=405)


    try:

        # =====================================================
        # DATOS RECIBIDOS
        # =====================================================

        datos = json.loads(
            request.body
        )


        proveedor_nombre = str(
            datos.get(
                "proveedor",
                ""
            )
        ).strip()


        factura = str(
            datos.get(
                "factura",
                ""
            )
        ).strip()


        observacion = str(
            datos.get(
                "observacion",
                ""
            )
        ).strip()


        detalle_recibido = (
            datos.get(
                "detalle",
                []
            )
        )


        usuario = str(
            datos.get(
                "usuario",
                "Administrador"
            )
        ).strip()


        compra_origen_id = (

            datos.get(
                "compra_origen_id"
            )

            or

            datos.get(
                "compra_origen"
            )

        )


        # =====================================================
        # VALIDACIONES
        # =====================================================

        if proveedor_nombre == "":

            return JsonResponse({

                "estado": False,

                "mensaje":
                    "Debe ingresar un proveedor"

            }, status=400)


        if factura == "":

            return JsonResponse({

                "estado": False,

                "mensaje":
                    "Debe ingresar una factura"

            }, status=400)


        if not isinstance(
            detalle_recibido,
            list
        ) or len(
            detalle_recibido
        ) == 0:

            return JsonResponse({

                "estado": False,

                "mensaje":
                    "Debe agregar al menos un medicamento"

            }, status=400)


        # =====================================================
        # COMPRA ORIGINAL A CORREGIR
        # =====================================================

        compra_origen = None


        if compra_origen_id:

            compra_origen = (
                Compra.objects
                .filter(
                    id=compra_origen_id
                )
                .first()
            )


            if not compra_origen:

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "La compra original no existe"

                }, status=404)


            if (
                compra_origen.estado
                != "ANULADA"
            ):

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "Solo se puede corregir una compra anulada"

                }, status=400)


            correccion_existente = (

                compra_origen
                .correcciones
                .exclude(
                    estado="ANULADA"
                )
                .exists()

            )


            if correccion_existente:

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "Esta compra ya tiene una corrección activa"

                }, status=400)


        # =====================================================
        # PREPARAR DETALLES
        # =====================================================

        detalles_preparados = []

        total_calculado = Decimal(
            "0.00"
        )


        for item in detalle_recibido:

            medicamento_id = (
                item.get(
                    "medicamento"
                )
            )


            try:

                cantidad = int(
                    item.get(
                        "cantidad",
                        0
                    )
                )

            except Exception:

                cantidad = 0


            try:

                precio = Decimal(
                    str(
                        item.get(
                            "precio_compra",
                            0
                        )
                    )
                )

            except Exception:

                precio = Decimal(
                    "0.00"
                )


            if cantidad <= 0:

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "La cantidad debe ser mayor a cero"

                }, status=400)


            if precio <= 0:

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "El precio de compra debe ser mayor a cero"

                }, status=400)


            medicamento = (
                Medicamento.objects
                .filter(
                    id=medicamento_id
                )
                .first()
            )


            if not medicamento:

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "Medicamento no encontrado"

                }, status=404)


            subtotal = (
                Decimal(
                    cantidad
                )
                *
                precio
            )


            total_calculado += (
                subtotal
            )


            detalles_preparados.append({

                "medicamento":
                    medicamento,

                "cantidad":
                    cantidad,

                "precio":
                    precio,

                "subtotal":
                    subtotal

            })


        # =====================================================
        # GUARDAR COMPRA Y STOCK
        # =====================================================

        with transaction.atomic():

            proveedor, creado = (
                Proveedor.objects
                .get_or_create(

                    nombre=
                        proveedor_nombre,

                    defaults={

                        "telefono": "",

                        "correo": "",

                        "direccion": ""

                    }

                )
            )


            compra = (
                Compra.objects
                .create(

                    proveedor=
                        proveedor,

                    factura=
                        factura,

                    total=
                        total_calculado,

                    observacion=
                        observacion,

                    estado=
                        "RECIBIDA",

                    compra_origen=
                        compra_origen

                )
            )


            for item in detalles_preparados:

                medicamento = (
                    Medicamento.objects
                    .select_for_update()
                    .get(
                        id=
                        item["medicamento"].id
                    )
                )


                DetalleCompra.objects.create(

                    compra=
                        compra,

                    medicamento=
                        medicamento,

                    cantidad=
                        item["cantidad"],

                    precio_compra=
                        item["precio"],

                    subtotal=
                        item["subtotal"]

                )


                # =============================================
                # AUMENTAR STOCK
                # =============================================

                medicamento.stock = (

                    int(
                        medicamento.stock
                        or 0
                    )

                    +

                    item["cantidad"]

                )


                medicamento.precio_compra = (
                    item["precio"]
                )


                medicamento.save()


        # =====================================================
        # TIPO DE OPERACIÓN
        # =====================================================

        if compra_origen:

            tipo_blockchain = (
                "CorreccionCompra"
            )

            tipo_registro = (
                "CORRECCION_COMPRA"
            )

            referencia_original = (
                compra_origen.factura
            )

            referencia = (

                "Compra corregida #"
                + str(compra.id)
                + " - Factura "
                + str(compra.factura)
                + " - Corrige "
                + str(
                    compra_origen.factura
                )

            )

            estado_registro = (
                "ACTIVA"
            )


        else:

            tipo_blockchain = (
                "Compra"
            )

            tipo_registro = (
                "COMPRA"
            )

            referencia_original = None

            referencia = (

                "Compra #"
                + str(compra.id)
                + " - Factura "
                + str(compra.factura)

            )

            estado_registro = (
                "ACTIVA"
            )


        # =====================================================
        # ENVIAR A BLOCKCHAIN
        # =====================================================

        datos_blockchain = {

            "compraId":
                compra.id,

            "proveedor":
                proveedor.nombre,

            "factura":
                compra.factura,

            "total":
                float(
                    compra.total
                ),

            "cantidadProductos":
                len(
                    detalles_preparados
                ),

            "compraOrigen": (
                compra_origen.id
                if compra_origen
                else None
            )

        }


        resultado_blockchain = (
            enviar_a_blockchain(

                tipo_blockchain,

                referencia,

                usuario,

                datos_blockchain

            )
        )


        # =====================================================
        # GUARDAR HASH PRINCIPAL EN COMPRA
        # =====================================================

        if resultado_blockchain.get(
            "estado",
            False
        ):

            compra.hash_operacion = (
                resultado_blockchain.get(
                    "hashOperacion"
                )
            )

            compra.transaction_hash = (
                resultado_blockchain.get(
                    "transactionHash"
                )
            )

            compra.block_number = (
                resultado_blockchain.get(
                    "blockNumber"
                )
            )

            compra.cuenta_blockchain = (
                resultado_blockchain.get(
                    "cuentaBlockchain"
                )
            )

            compra.save()


        # =====================================================
        # CREAR HISTORIAL BLOCKCHAIN
        # =====================================================

        crear_registro_blockchain(

            compra=
                compra,

            tipo_operacion=
                tipo_registro,

            referencia=
                compra.factura,

            usuario=
                usuario,

            resultado_blockchain=
                resultado_blockchain,

            referencia_original=
                referencia_original,

            estado_exito=
                estado_registro

        )


        # =====================================================
        # RESPUESTA
        # =====================================================

        return JsonResponse({

            "estado": True,

            "mensaje": (

                "Compra corregida registrada correctamente"

                if compra_origen

                else
                "Compra registrada correctamente"

            ),

            "compraId":
                compra.id,

            "tipoOperacion":
                tipo_registro,

            "total":
                float(
                    compra.total
                ),

            "blockchain":
                resultado_blockchain

        })


    except Exception as error:

        print(
            "ERROR AL REGISTRAR COMPRA:",
            str(error)
        )


        return JsonResponse({

            "estado": False,

            "mensaje":
                "Error al registrar compra",

            "error":
                str(error)

        }, status=500)


# ============================================================
# ANULAR COMPRA
# ============================================================

@csrf_exempt
def anular_compra(
    request,
    id
):

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


        motivo = str(
            datos.get(
                "motivo",
                ""
            )
        ).strip()


        usuario = str(
            datos.get(
                "usuario",
                "Administrador"
            )
        ).strip()


        # =====================================================
        # VALIDAR MOTIVO
        # =====================================================

        if motivo == "":

            return JsonResponse({

                "estado": False,

                "mensaje":
                    "Debe indicar el motivo de la anulación"

            }, status=400)


        if len(motivo) < 5:

            return JsonResponse({

                "estado": False,

                "mensaje":
                    "El motivo de anulación es demasiado corto"

            }, status=400)


        stock_restaurado = []


        # =====================================================
        # ANULACIÓN Y REVERSIÓN DE STOCK
        # =====================================================

        with transaction.atomic():

            try:

                compra = (
                    Compra.objects
                    .select_for_update()
                    .get(
                        id=id
                    )
                )

            except Compra.DoesNotExist:

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "La compra no existe"

                }, status=404)


            # =================================================
            # YA ANULADA
            # =================================================

            if compra.estado == "ANULADA":

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "La compra ya se encuentra anulada"

                }, status=400)


            detalles = list(

                DetalleCompra.objects
                .filter(
                    compra=compra
                )

            )


            if len(detalles) == 0:

                return JsonResponse({

                    "estado": False,

                    "mensaje":
                        "La compra no tiene medicamentos asociados"

                }, status=400)


            # =================================================
            # SUMAR CANTIDADES POR MEDICAMENTO
            # =================================================

            cantidades = {}


            for detalle in detalles:

                medicamento_id = (
                    detalle.medicamento_id
                )


                if (
                    medicamento_id
                    not in cantidades
                ):

                    cantidades[
                        medicamento_id
                    ] = 0


                cantidades[
                    medicamento_id
                ] += int(
                    detalle.cantidad
                )


            # =================================================
            # BLOQUEAR MEDICAMENTOS
            # =================================================

            medicamentos = (

                Medicamento.objects
                .select_for_update()
                .filter(
                    id__in=
                        cantidades.keys()
                )

            )


            medicamentos_map = {

                medicamento.id:
                    medicamento

                for medicamento
                in medicamentos

            }


            # =================================================
            # VALIDAR STOCK
            # =================================================
            # Una compra aumenta stock.
            # Para anularla tenemos que retirar esa cantidad.
            #
            # Si ya se vendieron esas unidades y no existe
            # suficiente stock, no permitimos dejar stock negativo.
            # =================================================

            for medicamento_id, cantidad in cantidades.items():

                medicamento = (
                    medicamentos_map.get(
                        medicamento_id
                    )
                )


                if not medicamento:

                    return JsonResponse({

                        "estado": False,

                        "mensaje":
                            "No se encontró uno de los medicamentos"

                    }, status=404)


                stock_actual = int(
                    medicamento.stock
                    or 0
                )


                if stock_actual < cantidad:

                    return JsonResponse({

                        "estado": False,

                        "mensaje": (
                            "No se puede anular la compra porque "
                            "el stock actual de "
                            + medicamento.nombre
                            + " es "
                            + str(stock_actual)
                            + " y se necesitan retirar "
                            + str(cantidad)
                            + " unidades."
                        )

                    }, status=400)


            # =================================================
            # REVERTIR STOCK
            # =================================================

            for medicamento_id, cantidad in cantidades.items():

                medicamento = (
                    medicamentos_map[
                        medicamento_id
                    ]
                )


                stock_anterior = int(
                    medicamento.stock
                    or 0
                )


                medicamento.stock = (

                    stock_anterior
                    -
                    cantidad

                )


                medicamento.save()


                stock_restaurado.append({

                    "medicamento":
                        medicamento.nombre,

                    "cantidad_revertida":
                        cantidad,

                    "stock_anterior":
                        stock_anterior,

                    "stock_actual":
                        medicamento.stock

                })


            # =================================================
            # ACTUALIZAR COMPRA
            # =================================================

            compra.estado = (
                "ANULADA"
            )

            compra.motivo_anulacion = (
                motivo
            )

            compra.fecha_anulacion = (
                timezone.now()
            )

            compra.anulado_por = (
                usuario
            )

            compra.save()


            # =================================================
            # CAMBIAR ESTADO DEL REGISTRO ORIGINAL
            # =================================================

            RegistroBlockchain.objects.filter(

                compra=compra,

                tipo_operacion__in=[
                    "COMPRA",
                    "CORRECCION_COMPRA"
                ]

            ).update(

                estado="ANULADA"

            )


        # =====================================================
        # BLOCKCHAIN DE LA ANULACIÓN
        # =====================================================

        referencia = (

            "Anulación Compra #"
            + str(compra.id)
            + " - Factura "
            + str(compra.factura)

        )


        datos_blockchain = {

            "compraId":
                compra.id,

            "factura":
                compra.factura,

            "proveedor":
                compra.proveedor.nombre,

            "total":
                float(
                    compra.total
                ),

            "motivo":
                motivo,

            "usuario":
                usuario,

            "stockRevertido":
                stock_restaurado

        }


        resultado_blockchain = (
            enviar_a_blockchain(

                "AnulacionCompra",

                referencia,

                usuario,

                datos_blockchain

            )
        )


        # =====================================================
        # GUARDAR REGISTRO DE ANULACIÓN
        # =====================================================

        crear_registro_blockchain(

            compra=
                compra,

            tipo_operacion=
                "ANULACION_COMPRA",

            referencia=
                compra.factura,

            referencia_original=
                compra.factura,

            motivo=
                motivo,

            usuario=
                usuario,

            resultado_blockchain=
                resultado_blockchain,

            estado_exito=
                "VERIFICADO"

        )


        # =====================================================
        # RESPUESTA
        # =====================================================

        return JsonResponse({

            "estado": True,

            "mensaje":
                "Compra anulada correctamente",

            "compraId":
                compra.id,

            "factura":
                compra.factura,

            "estadoCompra":
                compra.estado,

            "motivo":
                compra.motivo_anulacion,

            "anuladoPor":
                compra.anulado_por,

            "fechaAnulacion":
                compra.fecha_anulacion.isoformat(),

            "stockRevertido":
                stock_restaurado,

            "blockchain":
                resultado_blockchain

        })


    except json.JSONDecodeError:

        return JsonResponse({

            "estado": False,

            "mensaje":
                "Los datos enviados no son válidos"

        }, status=400)


    except Exception as error:

        print(
            "ERROR AL ANULAR COMPRA:",
            str(error)
        )


        return JsonResponse({

            "estado": False,

            "mensaje":
                "Error al anular la compra",

            "error":
                str(error)

        }, status=500)


# ============================================================
# DETALLE DE COMPRA
# ============================================================

@csrf_exempt
def detalle_compra(
    request,
    id
):

    if request.method != "GET":

        return JsonResponse({

            "estado": False,

            "mensaje":
                "Método no permitido"

        }, status=405)


    compra = get_object_or_404(
        Compra,
        id=id
    )


    detalle = []


    for d in (
        DetalleCompra.objects
        .filter(
            compra=compra
        )
        .select_related(
            "medicamento"
        )
    ):

        detalle.append({

            "medicamento_id":
                d.medicamento.id,

            "medicamento":
                d.medicamento.nombre,

            "cantidad":
                d.cantidad,

            "precio":
                float(
                    d.precio_compra
                ),

            "precio_compra":
                float(
                    d.precio_compra
                ),

            "subtotal":
                float(
                    d.subtotal
                )

        })


    correcciones = []


    for correccion in (
        compra.correcciones
        .all()
        .order_by("-id")
    ):

        correcciones.append({

            "id":
                correccion.id,

            "factura":
                correccion.factura,

            "estado":
                correccion.estado,

            "fecha":
                str(
                    correccion.fecha
                )

        })


    return JsonResponse({

        "id":
            compra.id,

        "proveedor":
            compra.proveedor.nombre,

        "factura":
            compra.factura,

        "fecha":
            compra.fecha.strftime(
                "%d/%m/%Y"
            ),

        "observacion":
            compra.observacion,

        "total":
            float(
                compra.total
            ),

        "estado":
            compra.estado,


        # ========================================
        # ANULACIÓN
        # ========================================

        "motivo_anulacion":
            compra.motivo_anulacion,

        "fecha_anulacion": (
            compra.fecha_anulacion.isoformat()
            if compra.fecha_anulacion
            else None
        ),

        "anulado_por":
            compra.anulado_por,


        # ========================================
        # CORRECCIÓN
        # ========================================

        "compra_origen_id": (
            compra.compra_origen.id
            if compra.compra_origen
            else None
        ),

        "compra_origen_factura": (
            compra.compra_origen.factura
            if compra.compra_origen
            else None
        ),

        "correcciones":
            correcciones,


        # ========================================
        # BLOCKCHAIN
        # ========================================

        "hash_operacion":
            compra.hash_operacion,

        "transaction_hash":
            compra.transaction_hash,

        "block_number":
            compra.block_number,

        "cuenta_blockchain":
            compra.cuenta_blockchain,


        "detalle":
            detalle

    })


# ============================================================
# DASHBOARD DE ENTRADAS
# ============================================================

@csrf_exempt
def dashboard_entradas(request):

    if request.method != "GET":

        return JsonResponse({

            "estado": False,

            "mensaje":
                "Método no permitido"

        }, status=405)


    from datetime import date


    hoy = date.today()


    # ========================================================
    # SOLO COMPRAS ACTIVAS
    # ========================================================

    compras = (

        Compra.objects

        .exclude(
            estado="ANULADA"
        )

        .order_by(
            "-id"
        )

    )


    # ========================================================
    # ENTRADAS DE HOY
    # ========================================================

    entradas_hoy = 0

    total_unidades_hoy = 0


    for compra in compras:

        if compra.fecha == hoy:

            entradas_hoy += 1


            detalles = (
                DetalleCompra.objects
                .filter(
                    compra=compra
                )
            )


            for detalle in detalles:

                total_unidades_hoy += (
                    detalle.cantidad
                )


    # ========================================================
    # TOTAL HISTÓRICO ACTIVO
    # ========================================================

    total_entradas = 0


    detalles_totales = (

        DetalleCompra.objects

        .exclude(
            compra__estado="ANULADA"
        )

    )


    for detalle in detalles_totales:

        total_entradas += (
            detalle.cantidad
        )


    # ========================================================
    # ÚLTIMA ENTRADA
    # ========================================================

    ultima = None


    if compras.exists():

        compra = compras.first()


        detalle = (

            DetalleCompra.objects
            .filter(
                compra=compra
            )
            .select_related(
                "medicamento"
            )
            .first()

        )


        if detalle:

            ultima = {

                "fecha":
                    compra.fecha.strftime(
                        "%d/%m/%Y"
                    ),

                "medicamento":
                    detalle.medicamento.nombre,

                "cantidad":
                    detalle.cantidad,

                "proveedor":
                    compra.proveedor.nombre

            }


    # ========================================================
    # MOVIMIENTOS
    # ========================================================

    movimientos = []


    detalles = (

        DetalleCompra.objects

        .select_related(
            "compra",
            "medicamento"
        )

        .exclude(
            compra__estado="ANULADA"
        )

        .order_by(
            "-id"
        )[:10]

    )


    for detalle in detalles:

        movimientos.append({

            "id":
                detalle.compra.id,

            "fecha":
                detalle.compra.fecha.strftime(
                    "%d/%m/%Y"
                ),

            "tipo":
                "Entrada",

            "medicamento":
                detalle.medicamento.nombre,

            "lote":
                detalle.medicamento.lote,

            "cantidad":
                detalle.cantidad,

            "usuario":
                "Administrador"

        })


    return JsonResponse({

        "estado": True,

        "entradasHoy":
            entradas_hoy,

        "totalUnidadesHoy":
            total_unidades_hoy,

        "totalEntradas":
            total_entradas,

        "ultimaEntrada":
            ultima,

        "movimientos":
            movimientos

    })


# ============================================================
# LISTAR REGISTROS BLOCKCHAIN
# ============================================================
# Este endpoint servirá después para la pantalla que viste
# en la imagen:
#
# Compra original
# Anulación
# Compra corregida
# ============================================================

@csrf_exempt
def listar_registros_blockchain(
    request
):

    if request.method != "GET":

        return JsonResponse({

            "estado": False,

            "mensaje":
                "Método no permitido"

        }, status=405)


    registros = (

        RegistroBlockchain.objects
        .select_related(
            "compra"
        )
        .all()
        .order_by(
            "-id"
        )

    )


    datos = []


    for registro in registros:

        referencia_visual = (
            registro.referencia
        )


        if (
            registro.tipo_operacion
            == "ANULACION_COMPRA"
        ):

            referencia_visual = (

                "Ref: "
                + str(
                    registro.referencia_original
                    or
                    registro.referencia
                )

            )


            if registro.motivo:

                referencia_visual += (

                    " | Motivo: "
                    + registro.motivo

                )


        datos.append({

            "id":
                registro.id,

            "hash_blockchain": (
                registro.hash_operacion
                or
                "No registrado"
            ),

            "hash_operacion":
                registro.hash_operacion,

            "transaction_hash":
                registro.transaction_hash,

            "block_number":
                registro.block_number,

            "cuenta_blockchain":
                registro.cuenta_blockchain,

            "tipo_operacion":
                registro.tipo_operacion,

            "operacion":
                registro.get_tipo_operacion_display(),

            "referencia":
                referencia_visual,

            "referencia_original":
                registro.referencia_original,

            "motivo":
                registro.motivo,

            "usuario":
                registro.usuario,

            "fecha":
                timezone.localtime(
                    registro.fecha
                ).strftime(
                    "%d/%m/%Y %H:%M"
                ),

            "estado":
                registro.estado,

            "compra_id": (
                registro.compra.id
                if registro.compra
                else None
            )

        })


    return JsonResponse(
        datos,
        safe=False
    )