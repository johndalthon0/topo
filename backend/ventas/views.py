from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from decimal import Decimal
from datetime import date

import hashlib
import json
import requests

from .models import (
    Venta,
    DetalleVenta,
    RegistroBlockchainVenta
)

from medicamentos.models import Medicamento
from usuarios_sistema.models import UsuarioSistema


# ============================================================
# CONFIGURACIÓN BLOCKCHAIN
# ============================================================

BLOCKCHAIN_URL = "http://127.0.0.1:3000/api/blockchain/registrar/"


# ============================================================
# GENERAR HASH DE OPERACIÓN
# ============================================================

def generar_hash_operacion(*valores):

    informacion = "|".join(
        str(valor)
        for valor in valores
    )

    return hashlib.sha256(
        informacion.encode("utf-8")
    ).hexdigest()


# ============================================================
# ENVIAR OPERACIÓN A BLOCKCHAIN
# ============================================================

def registrar_en_blockchain(
    hash_operacion,
    tipo_operacion,
    referencia,
    usuario,
    datos_operacion
):

    try:

        datos_enviados = {
            "hashOperacion": hash_operacion,
            "tipoOperacion": tipo_operacion,
            "referencia": referencia,
            "usuario": usuario,
            "datosOperacion": datos_operacion
        }

        print("")
        print("==========================================")
        print("ENVIANDO OPERACIÓN A BLOCKCHAIN")
        print("==========================================")
        print("DATOS ENVIADOS:", datos_enviados)

        respuesta = requests.post(
            BLOCKCHAIN_URL,
            json=datos_enviados,
            timeout=30
        )

        print("STATUS BLOCKCHAIN:", respuesta.status_code)
        print("RESPUESTA BLOCKCHAIN:", respuesta.text)

        try:
            resultado = respuesta.json()
        except Exception:
            return {
                "estado": False,
                "mensaje": "Blockchain devolvió una respuesta que no es JSON",
                "respuesta": respuesta.text
            }

        if respuesta.status_code >= 400:
            return {
                "estado": False,
                "mensaje": "El servicio Blockchain devolvió un error",
                "detalle": resultado
            }

        return resultado

    except requests.exceptions.ConnectionError as error:

        print("ERROR: BLOCKCHAIN NO DISPONIBLE")
        print(error)

        return {
            "estado": False,
            "mensaje": "No se pudo conectar con el servicio Blockchain",
            "error": str(error)
        }

    except requests.exceptions.Timeout as error:

        print("ERROR: TIEMPO AGOTADO BLOCKCHAIN")
        print(error)

        return {
            "estado": False,
            "mensaje": "Blockchain tardó demasiado en responder",
            "error": str(error)
        }

    except Exception as error:

        print("ERROR BLOCKCHAIN:", error)

        return {
            "estado": False,
            "mensaje": "Error al comunicarse con Blockchain",
            "error": str(error)
        }


# ============================================================
# CREAR REGISTRO LOCAL DEL HISTORIAL BLOCKCHAIN
# ============================================================

def crear_registro_blockchain_venta(
    venta,
    tipo_operacion,
    referencia,
    usuario,
    resultado_blockchain,
    referencia_original=None,
    motivo=None,
    estado_exito="VERIFICADO",
    hash_generado=None
):

    blockchain_ok = bool(
        resultado_blockchain.get(
            "estado",
            False
        )
    )

    hash_final = resultado_blockchain.get(
        "hashOperacion"
    ) or hash_generado

    registro = RegistroBlockchainVenta.objects.create(
        venta=venta,
        tipo_operacion=tipo_operacion,
        referencia=referencia,
        referencia_original=referencia_original,
        motivo=motivo,
        usuario=usuario,
        estado=(
            estado_exito
            if blockchain_ok
            else "NO_REGISTRADO"
        ),
        hash_operacion=hash_final,
        transaction_hash=resultado_blockchain.get(
            "transactionHash"
        ),
        block_number=resultado_blockchain.get(
            "blockNumber"
        ),
        cuenta_blockchain=(
            resultado_blockchain.get(
                "cuentaBlockchain"
            )
            or
            resultado_blockchain.get(
                "cuentaRegistradora"
            )
        )
    )

    return registro


# ============================================================
# LISTAR VENTAS
# ============================================================

@csrf_exempt
def listar_ventas(request):

    if request.method != "GET":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    ventas = (
        Venta.objects
        .select_related(
            "usuario",
            "venta_origen"
        )
        .all()
        .order_by("-id")
    )

    datos = []

    for venta in ventas:

        detalles = []

        for detalle in (
            DetalleVenta.objects
            .filter(venta=venta)
            .select_related("medicamento")
        ):

            detalles.append({
                "id": detalle.id,
                "medicamento": detalle.medicamento.nombre,
                "medicamento_id": detalle.medicamento.id,
                "cantidad": detalle.cantidad,
                "precio": float(detalle.precio_venta),
                "precio_venta": float(detalle.precio_venta),
                "subtotal": float(detalle.subtotal)
            })

        correccion_activa = (
            venta.correcciones
            .exclude(estado="ANULADA")
            .first()
        )

        datos.append({
            "id": venta.id,

            "usuario": (
                venta.usuario.nombre
                if venta.usuario
                else "Administrador"
            ),

            "usuario_id": (
                venta.usuario.id
                if venta.usuario
                else None
            ),

            "cliente": venta.cliente,
            "fecha": str(venta.fecha),
            "numero_venta": venta.numero_venta,
            "total": float(venta.total),
            "estado": venta.estado,
            "observacion": venta.observacion,

            # ANULACIÓN
            "motivo_anulacion": venta.motivo_anulacion,

            "fecha_anulacion": (
                venta.fecha_anulacion.isoformat()
                if venta.fecha_anulacion
                else None
            ),

            "anulado_por": venta.anulado_por,

            # CORRECCIÓN
            "venta_origen_id": (
                venta.venta_origen.id
                if venta.venta_origen
                else None
            ),

            "venta_origen_numero": (
                venta.venta_origen.numero_venta
                if venta.venta_origen
                else None
            ),

            "correccion_id": (
                correccion_activa.id
                if correccion_activa
                else None
            ),

            "correccion_numero": (
                correccion_activa.numero_venta
                if correccion_activa
                else None
            ),

            "puede_anular": (
                venta.estado != "ANULADA"
            ),

            "puede_corregir": (
                venta.estado == "ANULADA"
                and correccion_activa is None
            ),

            # BLOCKCHAIN
            "hash_operacion": venta.hash_operacion,
            "transaction_hash": venta.transaction_hash,
            "block_number": venta.block_number,
            "cuenta_blockchain": venta.cuenta_blockchain,

            "estado_blockchain": (
                "Verificado"
                if (
                    venta.hash_operacion
                    and venta.transaction_hash
                    and venta.block_number is not None
                )
                else "No registrado"
            ),

            "detalle": detalles
        })

    return JsonResponse(
        datos,
        safe=False
    )


# ============================================================
# REGISTRAR VENTA
# ============================================================

@csrf_exempt
def registrar_venta(request):

    if request.method != "POST":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    try:

        datos = json.loads(
            request.body
        )

        cliente = str(
            datos.get(
                "cliente",
                "Consumidor Final"
            )
        ).strip()

        if cliente == "":
            cliente = "Consumidor Final"

        observacion = str(
            datos.get(
                "observacion",
                ""
            )
        ).strip()

        detalle_recibido = datos.get(
            "detalle",
            []
        )

        if (
            not isinstance(
                detalle_recibido,
                list
            )
            or
            len(detalle_recibido) == 0
        ):
            return JsonResponse({
                "estado": False,
                "mensaje": "La venta debe contener al menos un medicamento"
            }, status=400)

        # =====================================================
        # USUARIO
        # =====================================================

        usuario = None

        if datos.get("usuario_id"):

            usuario = (
                UsuarioSistema.objects
                .filter(
                    id=datos["usuario_id"]
                )
                .first()
            )

            if not usuario:
                return JsonResponse({
                    "estado": False,
                    "mensaje": "El usuario indicado no existe"
                }, status=404)

        nombre_usuario = (
            usuario.nombre
            if usuario
            else "Administrador"
        )

        # =====================================================
        # VENTA ORIGINAL A CORREGIR
        # =====================================================

        venta_origen_id = (
            datos.get("venta_origen_id")
            or
            datos.get("venta_origen")
        )

        venta_origen = None

        if venta_origen_id:

            venta_origen = (
                Venta.objects
                .filter(
                    id=venta_origen_id
                )
                .first()
            )

            if not venta_origen:
                return JsonResponse({
                    "estado": False,
                    "mensaje": "La venta original no existe"
                }, status=404)

            if venta_origen.estado != "ANULADA":
                return JsonResponse({
                    "estado": False,
                    "mensaje": "Solo se puede corregir una venta anulada"
                }, status=400)

            if (
                venta_origen
                .correcciones
                .exclude(
                    estado="ANULADA"
                )
                .exists()
            ):
                return JsonResponse({
                    "estado": False,
                    "mensaje": "Esta venta ya tiene una corrección activa"
                }, status=400)

        # =====================================================
        # PREPARAR DETALLE
        # =====================================================

        detalles_preparados = []
        cantidades_por_medicamento = {}
        total_calculado = Decimal("0.00")

        for item in detalle_recibido:

            medicamento_id = item.get(
                "medicamento"
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
                            "precio_venta",
                            0
                        )
                    )
                )
            except Exception:
                precio = Decimal("0.00")

            if cantidad <= 0:
                return JsonResponse({
                    "estado": False,
                    "mensaje": "La cantidad debe ser mayor que cero"
                }, status=400)

            if precio <= 0:
                return JsonResponse({
                    "estado": False,
                    "mensaje": "El precio de venta debe ser mayor que cero"
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
                    "mensaje": "Medicamento no encontrado"
                }, status=404)

            subtotal = (
                Decimal(cantidad)
                *
                precio
            )

            total_calculado += subtotal

            detalles_preparados.append({
                "medicamento_id": medicamento.id,
                "cantidad": cantidad,
                "precio": precio,
                "subtotal": subtotal
            })

            cantidades_por_medicamento[
                medicamento.id
            ] = (
                cantidades_por_medicamento.get(
                    medicamento.id,
                    0
                )
                +
                cantidad
            )

        numero_venta = str(
            datos.get(
                "numero_venta",
                ""
            )
        ).strip()

        if numero_venta == "":
            numero_venta = (
                "VTA-"
                +
                str(
                    int(
                        timezone.now().timestamp()
                        * 1000
                    )
                )
            )

        # =====================================================
        # GUARDAR VENTA Y DESCONTAR STOCK
        # =====================================================

        with transaction.atomic():

            # Bloquear venta original mientras se crea corrección
            if venta_origen:

                venta_origen = (
                    Venta.objects
                    .select_for_update()
                    .get(
                        id=venta_origen.id
                    )
                )

                if venta_origen.estado != "ANULADA":
                    return JsonResponse({
                        "estado": False,
                        "mensaje": "La venta original ya no está anulada"
                    }, status=400)

                if (
                    venta_origen
                    .correcciones
                    .exclude(
                        estado="ANULADA"
                    )
                    .exists()
                ):
                    return JsonResponse({
                        "estado": False,
                        "mensaje": "Esta venta ya tiene una corrección activa"
                    }, status=400)

            medicamentos_bloqueados = (
                Medicamento.objects
                .select_for_update()
                .filter(
                    id__in=
                    cantidades_por_medicamento.keys()
                )
            )

            mapa_medicamentos = {
                medicamento.id: medicamento
                for medicamento
                in medicamentos_bloqueados
            }

            # Validar el stock total requerido por medicamento
            for medicamento_id, cantidad_total in cantidades_por_medicamento.items():

                medicamento = mapa_medicamentos.get(
                    medicamento_id
                )

                if not medicamento:
                    return JsonResponse({
                        "estado": False,
                        "mensaje": "No se encontró uno de los medicamentos"
                    }, status=404)

                stock_actual = int(
                    medicamento.stock
                    or 0
                )

                if stock_actual < cantidad_total:
                    return JsonResponse({
                        "estado": False,
                        "mensaje": (
                            "Stock insuficiente para "
                            + medicamento.nombre
                            + ". Disponible: "
                            + str(stock_actual)
                            + ", solicitado: "
                            + str(cantidad_total)
                        )
                    }, status=400)

            venta = Venta.objects.create(
                usuario=usuario,
                cliente=cliente,
                numero_venta=numero_venta,
                total=total_calculado,
                estado="COMPLETADA",
                observacion=observacion,
                venta_origen=venta_origen
            )

            cantidad_productos = 0
            unidades_vendidas = 0

            for item in detalles_preparados:

                medicamento = mapa_medicamentos[
                    item["medicamento_id"]
                ]

                DetalleVenta.objects.create(
                    venta=venta,
                    medicamento=medicamento,
                    cantidad=item["cantidad"],
                    precio_venta=item["precio"],
                    subtotal=item["subtotal"]
                )

                medicamento.stock = (
                    int(
                        medicamento.stock
                        or 0
                    )
                    -
                    item["cantidad"]
                )

                medicamento.save()

                cantidad_productos += 1
                unidades_vendidas += item[
                    "cantidad"
                ]

        # =====================================================
        # HASH
        # =====================================================

        hash_operacion = generar_hash_operacion(
            venta.id,
            venta.numero_venta,
            venta.total,
            venta.fecha,
            unidades_vendidas,
            (
                venta_origen.id
                if venta_origen
                else ""
            )
        )

        # =====================================================
        # TIPO DE REGISTRO
        # =====================================================

        if venta_origen:

            tipo_blockchain = "CorreccionVenta"
            tipo_registro = "CORRECCION_VENTA"

            referencia_blockchain = (
                "Venta corregida #"
                + str(venta.id)
                + " - "
                + venta.numero_venta
                + " - Corrige "
                + venta_origen.numero_venta
            )

            referencia_original = (
                venta_origen.numero_venta
            )

            estado_registro = "ACTIVA"

        else:

            tipo_blockchain = "Venta"
            tipo_registro = "VENTA"

            referencia_blockchain = (
                "Venta #"
                + str(venta.id)
                + " - "
                + venta.numero_venta
            )

            referencia_original = None
            estado_registro = "ACTIVA"

        datos_operacion = {
            "ventaId": venta.id,
            "numeroVenta": venta.numero_venta,
            "cliente": venta.cliente,
            "total": float(venta.total),
            "fecha": str(venta.fecha),
            "cantidadProductos": cantidad_productos,
            "unidadesVendidas": unidades_vendidas,
            "ventaOrigen": (
                venta_origen.id
                if venta_origen
                else None
            )
        }

        resultado_blockchain = registrar_en_blockchain(
            hash_operacion=hash_operacion,
            tipo_operacion=tipo_blockchain,
            referencia=referencia_blockchain,
            usuario=nombre_usuario,
            datos_operacion=datos_operacion
        )

        # =====================================================
        # GUARDAR DATOS BLOCKCHAIN EN LA VENTA
        # =====================================================

        if resultado_blockchain.get(
            "estado",
            False
        ):

            venta.hash_operacion = (
                resultado_blockchain.get(
                    "hashOperacion"
                )
                or
                hash_operacion
            )

            venta.transaction_hash = (
                resultado_blockchain.get(
                    "transactionHash"
                )
            )

            block_number = (
                resultado_blockchain.get(
                    "blockNumber"
                )
            )

            if block_number is not None:
                venta.block_number = int(
                    block_number
                )

            venta.cuenta_blockchain = (
                resultado_blockchain.get(
                    "cuentaBlockchain"
                )
                or
                resultado_blockchain.get(
                    "cuentaRegistradora"
                )
            )

            venta.save()

        # =====================================================
        # CREAR HISTORIAL BLOCKCHAIN
        # =====================================================

        crear_registro_blockchain_venta(
            venta=venta,
            tipo_operacion=tipo_registro,
            referencia=venta.numero_venta,
            usuario=nombre_usuario,
            resultado_blockchain=resultado_blockchain,
            referencia_original=referencia_original,
            estado_exito=estado_registro,
            hash_generado=hash_operacion
        )

        # =====================================================
        # RESPUESTA
        # =====================================================

        mensaje = (
            "Venta corregida registrada correctamente"
            if venta_origen
            else "Venta registrada correctamente"
        )

        if not resultado_blockchain.get(
            "estado",
            False
        ):
            mensaje += (
                ", pero Blockchain no pudo registrar la operación"
            )

        return JsonResponse({
            "estado": True,
            "mensaje": mensaje,
            "ventaId": venta.id,
            "venta_id": venta.id,
            "numero_venta": venta.numero_venta,
            "tipoOperacion": tipo_registro,
            "total": float(venta.total),
            "blockchain": resultado_blockchain
        }, status=201)

    except json.JSONDecodeError:

        return JsonResponse({
            "estado": False,
            "mensaje": "JSON inválido"
        }, status=400)

    except Exception as error:

        print("ERROR REGISTRANDO VENTA:", error)

        return JsonResponse({
            "estado": False,
            "mensaje": "Error al registrar venta",
            "error": str(error)
        }, status=500)


# ============================================================
# ANULAR VENTA
# ============================================================

@csrf_exempt
def anular_venta(request, id):

    if request.method != "POST":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
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

        usuario_accion = str(
            datos.get(
                "usuario",
                "Administrador"
            )
        ).strip()

        if motivo == "":
            return JsonResponse({
                "estado": False,
                "mensaje": "Debe indicar el motivo de la anulación"
            }, status=400)

        if len(motivo) < 5:
            return JsonResponse({
                "estado": False,
                "mensaje": "El motivo de anulación es demasiado corto"
            }, status=400)

        stock_restaurado = []

        # =====================================================
        # ANULAR Y DEVOLVER STOCK
        # =====================================================

        with transaction.atomic():

            try:

                venta = (
                    Venta.objects
                    .select_for_update()
                    .select_related("usuario")
                    .get(id=id)
                )

            except Venta.DoesNotExist:

                return JsonResponse({
                    "estado": False,
                    "mensaje": "La venta no existe"
                }, status=404)

            if venta.estado == "ANULADA":

                return JsonResponse({
                    "estado": False,
                    "mensaje": "La venta ya se encuentra anulada"
                }, status=400)

            detalles = list(
                DetalleVenta.objects
                .filter(venta=venta)
            )

            if len(detalles) == 0:

                return JsonResponse({
                    "estado": False,
                    "mensaje": "La venta no tiene medicamentos asociados"
                }, status=400)

            cantidades = {}

            for detalle in detalles:

                cantidades[
                    detalle.medicamento_id
                ] = (
                    cantidades.get(
                        detalle.medicamento_id,
                        0
                    )
                    +
                    int(
                        detalle.cantidad
                    )
                )

            medicamentos = (
                Medicamento.objects
                .select_for_update()
                .filter(
                    id__in=cantidades.keys()
                )
            )

            medicamentos_map = {
                medicamento.id: medicamento
                for medicamento
                in medicamentos
            }

            for medicamento_id, cantidad in cantidades.items():

                medicamento = (
                    medicamentos_map.get(
                        medicamento_id
                    )
                )

                if not medicamento:

                    return JsonResponse({
                        "estado": False,
                        "mensaje": "No se encontró uno de los medicamentos"
                    }, status=404)

                stock_anterior = int(
                    medicamento.stock
                    or 0
                )

                medicamento.stock = (
                    stock_anterior
                    +
                    cantidad
                )

                medicamento.save()

                stock_restaurado.append({
                    "medicamento": medicamento.nombre,
                    "cantidad_devuelta": cantidad,
                    "stock_anterior": stock_anterior,
                    "stock_actual": medicamento.stock
                })

            venta.estado = "ANULADA"
            venta.motivo_anulacion = motivo
            venta.fecha_anulacion = timezone.now()
            venta.anulado_por = usuario_accion
            venta.save()

            # El registro original se conserva, pero se marca anulado.
            RegistroBlockchainVenta.objects.filter(
                venta=venta,
                tipo_operacion__in=[
                    "VENTA",
                    "CORRECCION_VENTA"
                ]
            ).update(
                estado="ANULADA"
            )

        # =====================================================
        # BLOCKCHAIN DE ANULACIÓN
        # =====================================================

        hash_anulacion = generar_hash_operacion(
            "ANULACION_VENTA",
            venta.id,
            venta.numero_venta,
            motivo,
            usuario_accion,
            timezone.now().isoformat()
        )

        referencia = (
            "Anulación Venta #"
            + str(venta.id)
            + " - "
            + venta.numero_venta
        )

        datos_operacion = {
            "ventaId": venta.id,
            "numeroVenta": venta.numero_venta,
            "cliente": venta.cliente,
            "total": float(venta.total),
            "motivo": motivo,
            "usuario": usuario_accion,
            "stockDevuelto": stock_restaurado
        }

        resultado_blockchain = registrar_en_blockchain(
            hash_operacion=hash_anulacion,
            tipo_operacion="AnulacionVenta",
            referencia=referencia,
            usuario=usuario_accion,
            datos_operacion=datos_operacion
        )

        crear_registro_blockchain_venta(
            venta=venta,
            tipo_operacion="ANULACION_VENTA",
            referencia=venta.numero_venta,
            referencia_original=venta.numero_venta,
            motivo=motivo,
            usuario=usuario_accion,
            resultado_blockchain=resultado_blockchain,
            estado_exito="VERIFICADO",
            hash_generado=hash_anulacion
        )

        return JsonResponse({
            "estado": True,
            "mensaje": "Venta anulada correctamente",
            "ventaId": venta.id,
            "numeroVenta": venta.numero_venta,
            "estadoVenta": venta.estado,
            "motivo": venta.motivo_anulacion,
            "anuladoPor": venta.anulado_por,
            "fechaAnulacion": (
                venta.fecha_anulacion.isoformat()
            ),
            "stockDevuelto": stock_restaurado,
            "blockchain": resultado_blockchain
        })

    except json.JSONDecodeError:

        return JsonResponse({
            "estado": False,
            "mensaje": "Los datos enviados no son válidos"
        }, status=400)

    except Exception as error:

        print(
            "ERROR AL ANULAR VENTA:",
            str(error)
        )

        return JsonResponse({
            "estado": False,
            "mensaje": "Error al anular la venta",
            "error": str(error)
        }, status=500)


# ============================================================
# OBTENER VENTA
# ============================================================

@csrf_exempt
def obtener_venta(request, id):

    if request.method != "GET":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    venta = get_object_or_404(
        Venta,
        id=id
    )

    detalles = []

    for detalle in (
        DetalleVenta.objects
        .filter(venta=venta)
        .select_related("medicamento")
    ):

        detalles.append({
            "id": detalle.id,
            "medicamento": detalle.medicamento.nombre,
            "medicamento_id": detalle.medicamento.id,
            "cantidad": detalle.cantidad,
            "precio": float(detalle.precio_venta),
            "precio_venta": float(detalle.precio_venta),
            "subtotal": float(detalle.subtotal)
        })

    correcciones = []

    for correccion in (
        venta.correcciones
        .all()
        .order_by("-id")
    ):

        correcciones.append({
            "id": correccion.id,
            "numero_venta": correccion.numero_venta,
            "estado": correccion.estado,
            "fecha": str(correccion.fecha)
        })

    return JsonResponse({
        "estado": True,

        "venta": {
            "id": venta.id,
            "numero_venta": venta.numero_venta,
            "cliente": venta.cliente,
            "fecha": str(venta.fecha),
            "total": float(venta.total),
            "estado": venta.estado,
            "observacion": venta.observacion,

            "usuario": (
                venta.usuario.nombre
                if venta.usuario
                else "Administrador"
            ),

            "motivo_anulacion": venta.motivo_anulacion,

            "fecha_anulacion": (
                venta.fecha_anulacion.isoformat()
                if venta.fecha_anulacion
                else None
            ),

            "anulado_por": venta.anulado_por,

            "venta_origen_id": (
                venta.venta_origen.id
                if venta.venta_origen
                else None
            ),

            "venta_origen_numero": (
                venta.venta_origen.numero_venta
                if venta.venta_origen
                else None
            ),

            "correcciones": correcciones,

            "hash_operacion": venta.hash_operacion,
            "transaction_hash": venta.transaction_hash,
            "block_number": venta.block_number,
            "cuenta_blockchain": venta.cuenta_blockchain,

            "detalle": detalles,
            "detalles": detalles
        }
    })


# ============================================================
# DASHBOARD VENTAS
# ============================================================

@csrf_exempt
def dashboard_ventas(request):

    if request.method != "GET":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    hoy = date.today()

    # Las ventas anuladas ya no deben sumar como salidas reales.
    ventas = (
        Venta.objects
        .exclude(estado="ANULADA")
        .order_by("-id")
    )

    ventas_hoy = ventas.filter(
        fecha=hoy
    )

    # SALIDAS HOY
    salidas_hoy = ventas_hoy.count()

    # UNIDADES HOY
    total_unidades_hoy = 0

    for venta in ventas_hoy:

        for detalle in (
            DetalleVenta.objects
            .filter(venta=venta)
        ):

            total_unidades_hoy += (
                detalle.cantidad
            )

    # TOTAL HISTÓRICO DE UNIDADES ACTIVAS
    total_unidades = 0

    for detalle in (
        DetalleVenta.objects
        .exclude(
            venta__estado="ANULADA"
        )
    ):

        total_unidades += (
            detalle.cantidad
        )

    # TOTAL VENTAS ACTIVAS
    total_ventas = sum(
        float(venta.total)
        for venta in ventas
    )

    # TOTAL HOY
    total_hoy = sum(
        float(venta.total)
        for venta in ventas_hoy
    )

    # SALIDAS RECIENTES ACTIVAS
    detalles = (
        DetalleVenta.objects
        .select_related(
            "venta",
            "venta__usuario",
            "medicamento"
        )
        .exclude(
            venta__estado="ANULADA"
        )
        .order_by("-id")[:10]
    )

    salidas = []

    for detalle in detalles:

        salidas.append({
            "id": detalle.venta.id,
            "fecha": detalle.venta.fecha.strftime(
                "%d/%m/%Y"
            ),
            "tipo": "Salida",
            "medicamento": detalle.medicamento.nombre,
            "lote": detalle.medicamento.lote,
            "cantidad": detalle.cantidad,
            "usuario": (
                detalle.venta.usuario.nombre
                if detalle.venta.usuario
                else "Administrador"
            )
        })

    ultima_salida = None

    if detalles:

        detalle = detalles[0]

        ultima_salida = {
            "fecha": detalle.venta.fecha.strftime(
                "%d/%m/%Y"
            ),
            "medicamento": detalle.medicamento.nombre,
            "cantidad": detalle.cantidad,
            "usuario": (
                detalle.venta.usuario.nombre
                if detalle.venta.usuario
                else "Administrador"
            )
        }

    return JsonResponse({
        "estado": True,

        "datos": {
            "total_ventas": total_ventas,
            "ventas_hoy": total_hoy,
            "cantidad_ventas": ventas.count(),
            "total_unidades": total_unidades
        },

        "salidasHoy": salidas_hoy,
        "totalUnidadesHoy": total_unidades_hoy,
        "totalSalidas": total_unidades,
        "ultimaSalida": ultima_salida,
        "salidas": salidas
    })


# ============================================================
# REGISTROS BLOCKCHAIN - COMPRAS + VENTAS
# ============================================================
# Se mantiene la misma URL que ya usa tu módulo Blockchain.
# Los registros nuevos utilizan el historial de cada operación.
# Los registros antiguos siguen apareciendo como respaldo.
# ============================================================

@csrf_exempt
def registros_blockchain(request):

    if request.method != "GET":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    try:

        from compras.models import Compra

        try:
            from compras.models import RegistroBlockchain
        except Exception:
            RegistroBlockchain = None

        registros = []

        compras_con_historial = set()
        ventas_con_historial = set()

        # =====================================================
        # HISTORIAL NUEVO DE COMPRAS
        # =====================================================

        if RegistroBlockchain is not None:

            for registro in (
                RegistroBlockchain.objects
                .select_related("compra")
                .all()
                .order_by("-id")
            ):

                if registro.compra_id:
                    compras_con_historial.add(
                        registro.compra_id
                    )

                operacion = (
                    registro.get_tipo_operacion_display()
                    if hasattr(
                        registro,
                        "get_tipo_operacion_display"
                    )
                    else registro.tipo_operacion
                )

                referencia = registro.referencia

                if (
                    registro.tipo_operacion
                    == "ANULACION_COMPRA"
                ):

                    referencia = (
                        "Ref: "
                        +
                        str(
                            registro.referencia_original
                            or registro.referencia
                        )
                    )

                    if registro.motivo:
                        referencia += (
                            " | Motivo: "
                            + registro.motivo
                        )

                registros.append({
                    "id": "C-H-" + str(registro.id),
                    "factura": registro.referencia,
                    "hash": registro.hash_operacion,
                    "transactionHash": registro.transaction_hash,
                    "blockNumber": registro.block_number,
                    "cuentaBlockchain": registro.cuenta_blockchain,
                    "estado": registro.estado,
                    "operacion": operacion,
                    "referencia": referencia,
                    "usuario": registro.usuario,
                    "fecha": registro.fecha.isoformat(),
                    "_orden": registro.fecha.timestamp()
                })

        # =====================================================
        # COMPRAS ANTIGUAS SIN HISTORIAL
        # =====================================================

        for compra in (
            Compra.objects
            .exclude(
                id__in=compras_con_historial
            )
            .order_by("-id")
        ):

            estado = (
                "Verificado"
                if (
                    compra.hash_operacion
                    and compra.transaction_hash
                    and compra.block_number is not None
                )
                else "No registrado"
            )

            registros.append({
                "id": "C-" + str(compra.id),
                "factura": compra.factura,
                "hash": compra.hash_operacion,
                "transactionHash": compra.transaction_hash,
                "blockNumber": compra.block_number,
                "cuentaBlockchain": compra.cuenta_blockchain,
                "estado": (
                    "ANULADA"
                    if compra.estado == "ANULADA"
                    else estado
                ),
                "operacion": "Compra original",
                "referencia": (
                    "Compra #"
                    + str(compra.id)
                    + " - Factura "
                    + str(compra.factura)
                ),
                "usuario": "Administrador",
                "fecha": str(compra.fecha),
                "_orden": (
                    timezone.make_aware(
                        timezone.datetime.combine(
                            compra.fecha,
                            timezone.datetime.min.time()
                        )
                    ).timestamp()
                )
            })

        # =====================================================
        # HISTORIAL NUEVO DE VENTAS
        # =====================================================

        for registro in (
            RegistroBlockchainVenta.objects
            .select_related("venta")
            .all()
            .order_by("-id")
        ):

            if registro.venta_id:
                ventas_con_historial.add(
                    registro.venta_id
                )

            referencia = registro.referencia

            if (
                registro.tipo_operacion
                == "ANULACION_VENTA"
            ):

                referencia = (
                    "Ref: "
                    +
                    str(
                        registro.referencia_original
                        or registro.referencia
                    )
                )

                if registro.motivo:
                    referencia += (
                        " | Motivo: "
                        + registro.motivo
                    )

            registros.append({
                "id": "V-H-" + str(registro.id),
                "factura": registro.referencia,
                "hash": registro.hash_operacion,
                "transactionHash": registro.transaction_hash,
                "blockNumber": registro.block_number,
                "cuentaBlockchain": registro.cuenta_blockchain,
                "estado": registro.estado,
                "operacion": registro.get_tipo_operacion_display(),
                "referencia": referencia,
                "usuario": registro.usuario,
                "fecha": registro.fecha.isoformat(),
                "_orden": registro.fecha.timestamp()
            })

        # =====================================================
        # VENTAS ANTIGUAS SIN HISTORIAL
        # =====================================================

        for venta in (
            Venta.objects
            .exclude(
                id__in=ventas_con_historial
            )
            .order_by("-id")
        ):

            estado = (
                "Verificado"
                if (
                    venta.hash_operacion
                    and venta.transaction_hash
                    and venta.block_number is not None
                )
                else "No registrado"
            )

            registros.append({
                "id": "V-" + str(venta.id),
                "factura": venta.numero_venta,
                "hash": venta.hash_operacion,
                "transactionHash": venta.transaction_hash,
                "blockNumber": venta.block_number,
                "cuentaBlockchain": venta.cuenta_blockchain,
                "estado": (
                    "ANULADA"
                    if venta.estado == "ANULADA"
                    else estado
                ),
                "operacion": "Venta original",
                "referencia": (
                    "Venta #"
                    + str(venta.id)
                    + " - "
                    + venta.numero_venta
                ),
                "usuario": (
                    venta.usuario.nombre
                    if venta.usuario
                    else "Administrador"
                ),
                "fecha": str(venta.fecha),
                "_orden": (
                    timezone.make_aware(
                        timezone.datetime.combine(
                            venta.fecha,
                            timezone.datetime.min.time()
                        )
                    ).timestamp()
                )
            })

        registros.sort(
            key=lambda x: x["_orden"],
            reverse=True
        )

        for registro in registros:
            registro.pop(
                "_orden",
                None
            )

        return JsonResponse(
            registros,
            safe=False
        )

    except Exception as error:

        print(
            "ERROR REGISTROS BLOCKCHAIN:",
            error
        )

        return JsonResponse({
            "estado": False,
            "mensaje": "Error al obtener registros Blockchain",
            "error": str(error)
        }, status=500)