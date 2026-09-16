from django.db import models


class IntentoSeguridadBD(models.Model):
    """Intentos directos bloqueados por MySQL."""

    id = models.BigAutoField(primary_key=True)
    fecha_hora = models.DateTimeField()
    usuario_bd = models.CharField(max_length=150)
    conexion_id = models.BigIntegerField(null=True, blank=True)
    tabla_afectada = models.CharField(max_length=100)
    registro_id = models.CharField(max_length=100, null=True, blank=True)
    referencia_registro = models.CharField(max_length=255, null=True, blank=True)
    accion = models.CharField(max_length=20)
    campos_modificados = models.TextField(null=True, blank=True)
    valor_anterior = models.TextField(null=True, blank=True)
    valor_intentado = models.TextField(null=True, blank=True)
    detalle = models.TextField()
    estado = models.CharField(max_length=30, default='BLOQUEADO')
    leida = models.BooleanField(default=False)
    fecha_revision = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'seguridad_intentos_bd'
        ordering = ['-fecha_hora', '-id']

    def __str__(self):
        return f"{self.accion} {self.tabla_afectada} #{self.registro_id or '-'}"
