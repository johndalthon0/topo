from django.views.decorators.csrf import csrf_exempt
from .models import Venta, DetalleVenta
from medicamentos.models import Medicamento
from decimal import Decimal
import json
from django.http import JsonResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404

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

    ventas = Venta.objects.all().order_by("-id")

    datos = []

    for venta in ventas:
        datos.append({
            "id": venta.id,
            "usuario": venta.usuario.nombre if venta.usuario else "Sistema",
            "fecha": venta.fecha,
            "numero_venta": venta.numero_venta,
            "total": float(venta.total),
            "estado": venta.estado
        })

    return JsonResponse(datos, safe=False)


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
        datos = json.loads(request.body)

        venta = Venta.objects.create(
            numero_venta=datos["numero_venta"],
            total=datos["total"],
            estado=datos.get("estado", "COMPLETADA"),
            observacion=datos.get("observacion", "")
        )

        for item in datos["detalle"]:
            medicamento = Medicamento.objects.get(id=item["medicamento"])

            DetalleVenta.objects.create(
                venta=venta,
                medicamento=medicamento,
                cantidad=item["cantidad"],
                precio_venta=item["precio_venta"],
                subtotal=item["subtotal"]
            )

            # ACTUALIZAR STOCK
            medicamento.stock -= int(item["cantidad"])
            medicamento.save()

        return JsonResponse({
            "estado": True,
            "mensaje": "Venta registrada correctamente",
            "venta_id": venta.id
        }, status=201)

    except Medicamento.DoesNotExist:
        return JsonResponse({
            "estado": False,
            "mensaje": "Medicamento no encontrado"
        }, status=404)

    except json.JSONDecodeError:
        return JsonResponse({
            "estado": False,
            "mensaje": "Los datos enviados no tienen un formato JSON válido"
        }, status=400)

    except Exception as e:
        return JsonResponse({
            "estado": False,
            "mensaje": "Error al registrar la venta",
            "error": str(e)
        }, status=500)


# ============================================================
# OBTENER DETALLE DE VENTA
# ============================================================

@csrf_exempt
def obtener_venta(request, id):

    if request.method != "GET":
        return JsonResponse({
            "estado": False,
            "mensaje": "Método no permitido"
        }, status=405)

    try:
        venta = Venta.objects.get(id=id)

        detalles = []
        for detalle in DetalleVenta.objects.filter(venta=venta):
            detalles.append({
                "id": detalle.id,
                "medicamento": detalle.medicamento.nombre,
                "cantidad": detalle.cantidad,
                "precio_venta": float(detalle.precio_venta),
                "subtotal": float(detalle.subtotal)
            })

        return JsonResponse({
            "estado": True,
            "venta": {
                "id": venta.id,
                "numero_venta": venta.numero_venta,
                "fecha": venta.fecha,
                "total": float(venta.total),
                "estado": venta.estado,
                "observacion": venta.observacion,
                "detalles": detalles
            }
        })

    except Venta.DoesNotExist:
        return JsonResponse({
            "estado": False,
            "mensaje": "Venta no encontrada"
        }, status=404)


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

    hoy = timezone.now().date()

    ventas = Venta.objects.all()
    ventas_hoy = Venta.objects.filter(fecha=hoy)

    total_ventas = sum(float(v.total) for v in ventas)
    total_hoy = sum(float(v.total) for v in ventas_hoy)

    total_unidades = sum(
        DetalleVenta.objects.filter(venta__in=ventas).values_list(
            'cantidad', flat=True
        )
    )

    return JsonResponse({
        "estado": True,
        "datos": {
            "total_ventas": total_ventas,
            "ventas_hoy": total_hoy,
            "cantidad_ventas": ventas.count(),
            "total_unidades": total_unidades
        }
    })
