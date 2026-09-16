from django.db.backends.signals import connection_created
from django.dispatch import receiver


@receiver(connection_created)
def marcar_conexion_farmacor(sender, connection, **kwargs):
    """Marca como autorizadas solamente las conexiones creadas por Django."""
    if connection.vendor != 'mysql':
        return

    with connection.cursor() as cursor:
        cursor.execute("SET @farmacor_autorizado = 1")
        cursor.execute("SET @farmacor_origen = 'DJANGO_FARMACOR'")
