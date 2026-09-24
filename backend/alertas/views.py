import requests
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.db.utils import OperationalError, ProgrammingError

from .models import IntentoSeguridadBD


BLOCKCHAIN_URL = settings.BLOCKCHAIN_SERVICE_URL


def _estado_blockchain(tabla, registro_id):
    """Comprueba si compras/ventas afectadas conservan evidencia Blockchain."""
    try:
        rid = int(registro_id) if registro_id not in (None, '', 'NULL') else None
    except (TypeError, ValueError):
        rid = None

    hash_operacion = None
    referencia = None

    try:
        if tabla == 'ventas_venta' and rid:
            from ventas.models import Venta
            obj = Venta.objects.filter(id=rid).first()
            if obj:
                hash_operacion = obj.hash_operacion
                referencia = obj.numero_venta

        elif tabla == 'ventas_detalleventa' and rid:
            from ventas.models import DetalleVenta
            obj = DetalleVenta.objects.select_related('venta').filter(id=rid).first()
            if obj:
                hash_operacion = obj.venta.hash_operacion
                referencia = obj.venta.numero_venta

        elif tabla == 'compras_compra' and rid:
            from compras.models import Compra
            obj = Compra.objects.filter(id=rid).first()
            if obj:
                hash_operacion = obj.hash_operacion
                referencia = obj.factura

        elif tabla == 'compras_detallecompra' and rid:
            from compras.models import DetalleCompra
            obj = DetalleCompra.objects.select_related('compra').filter(id=rid).first()
            if obj:
                hash_operacion = obj.compra.hash_operacion
                referencia = obj.compra.factura
    except Exception:
        pass

    if not hash_operacion:
        return {
            'estado': 'SIN_REGISTRO',
            'verificado': False,
            'mensaje': 'No existe un hash Blockchain asociado a este registro.'
        }

    try:
        respuesta = requests.post(
            f'{BLOCKCHAIN_URL}/api/blockchain/verificar/',
            json={'hashOperacion': hash_operacion, 'referencia': referencia or ''},
            timeout=3
        )
        if respuesta.ok:
            data = respuesta.json()
            if data.get('estado') and data.get('encontrado'):
                return {
                    'estado': 'VERIFICADO',
                    'verificado': True,
                    'mensaje': 'El hash original continúa registrado en Blockchain.',
                    'hash': hash_operacion
                }
    except Exception:
        pass

    return {
        'estado': 'REGISTRADO_LOCALMENTE',
        'verificado': False,
        'mensaje': 'Existe evidencia Blockchain local; el servicio Blockchain no respondió para validación en línea.',
        'hash': hash_operacion
    }


def _serializar_alerta(alerta, verificar_blockchain=False):
    return {
        'id': alerta.id,
        'fecha_hora': alerta.fecha_hora.isoformat() if alerta.fecha_hora else None,
        'usuario_bd': alerta.usuario_bd,
        'conexion_id': alerta.conexion_id,
        'tabla_afectada': alerta.tabla_afectada,
        'registro_id': alerta.registro_id,
        'referencia_registro': alerta.referencia_registro,
        'accion': alerta.accion,
        'campos_modificados': alerta.campos_modificados,
        'valor_anterior': alerta.valor_anterior,
        'valor_intentado': alerta.valor_intentado,
        'detalle': alerta.detalle,
        'estado': alerta.estado,
        'leida': bool(alerta.leida),
        'fecha_revision': alerta.fecha_revision.isoformat() if alerta.fecha_revision else None,
        'blockchain': _estado_blockchain(alerta.tabla_afectada, alerta.registro_id)
            if verificar_blockchain else None,
    }


def listar_notificaciones(request):
    if request.method != 'GET':
        return JsonResponse({'estado': False, 'mensaje': 'Método no permitido'}, status=405)

    try:
        solo_no_leidas = request.GET.get('solo_no_leidas', '0') == '1'
        verificar = request.GET.get('verificar_blockchain', '0') == '1'
        try:
            limite = min(max(int(request.GET.get('limite', '50')), 1), 200)
        except ValueError:
            limite = 50

        qs = IntentoSeguridadBD.objects.all()
        if solo_no_leidas:
            qs = qs.filter(leida=False)

        alertas = list(qs[:limite])
        return JsonResponse({
            'estado': True,
            'total': len(alertas),
            'no_leidas': IntentoSeguridadBD.objects.filter(leida=False).count(),
            'notificaciones': [_serializar_alerta(a, verificar) for a in alertas]
        })

    except (OperationalError, ProgrammingError) as error:
        return JsonResponse({
            'estado': False,
            'instalado': False,
            'mensaje': 'La protección de base de datos todavía no está instalada.',
            'detalle': str(error)
        }, status=503)


def contador_notificaciones(request):
    if request.method != 'GET':
        return JsonResponse({'estado': False, 'mensaje': 'Método no permitido'}, status=405)
    try:
        return JsonResponse({
            'estado': True,
            'no_leidas': IntentoSeguridadBD.objects.filter(leida=False).count(),
        })
    except (OperationalError, ProgrammingError):
        return JsonResponse({'estado': True, 'no_leidas': 0, 'instalado': False})


@csrf_exempt
def marcar_leida(request, alerta_id):
    if request.method not in ('POST', 'PATCH'):
        return JsonResponse({'estado': False, 'mensaje': 'Método no permitido'}, status=405)
    try:
        alerta = IntentoSeguridadBD.objects.filter(id=alerta_id).first()
        if not alerta:
            return JsonResponse({'estado': False, 'mensaje': 'Notificación no encontrada'}, status=404)
        alerta.leida = True
        alerta.fecha_revision = timezone.now()
        alerta.save(update_fields=['leida', 'fecha_revision'])
        return JsonResponse({'estado': True, 'mensaje': 'Notificación marcada como revisada'})
    except (OperationalError, ProgrammingError) as error:
        return JsonResponse({'estado': False, 'mensaje': str(error)}, status=503)


@csrf_exempt
def marcar_todas_leidas(request):
    if request.method not in ('POST', 'PATCH'):
        return JsonResponse({'estado': False, 'mensaje': 'Método no permitido'}, status=405)
    try:
        IntentoSeguridadBD.objects.filter(leida=False).update(
            leida=True,
            fecha_revision=timezone.now()
        )
        return JsonResponse({'estado': True, 'mensaje': 'Todas las notificaciones fueron revisadas'})
    except (OperationalError, ProgrammingError) as error:
        return JsonResponse({'estado': False, 'mensaje': str(error)}, status=503)


def detalle_notificacion(request, alerta_id):
    if request.method != 'GET':
        return JsonResponse({'estado': False, 'mensaje': 'Método no permitido'}, status=405)
    try:
        alerta = IntentoSeguridadBD.objects.filter(id=alerta_id).first()
        if not alerta:
            return JsonResponse({'estado': False, 'mensaje': 'Notificación no encontrada'}, status=404)
        return JsonResponse({
            'estado': True,
            'notificacion': _serializar_alerta(alerta, verificar_blockchain=True)
        })
    except (OperationalError, ProgrammingError) as error:
        return JsonResponse({'estado': False, 'mensaje': str(error)}, status=503)
