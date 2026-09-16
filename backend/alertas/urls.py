from django.urls import path

from .views import (
    contador_notificaciones,
    detalle_notificacion,
    listar_notificaciones,
    marcar_leida,
    marcar_todas_leidas,
)

urlpatterns = [
    path('notificaciones/', listar_notificaciones, name='listar_notificaciones'),
    path('notificaciones/contador/', contador_notificaciones, name='contador_notificaciones'),
    path('notificaciones/<int:alerta_id>/', detalle_notificacion, name='detalle_notificacion'),
    path('notificaciones/<int:alerta_id>/leida/', marcar_leida, name='marcar_leida'),
    path('notificaciones/marcar-todas/', marcar_todas_leidas, name='marcar_todas_leidas'),
]
