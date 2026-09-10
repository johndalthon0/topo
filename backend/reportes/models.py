from django.db import models


class Reporte(models.Model):

    TIPO_REPORTE = [

        ('Compras', 'Compras'),
        ('Ventas', 'Ventas'),
        ('Inventario', 'Inventario'),
        ('General', 'General'),

    ]

    id_reporte = models.AutoField(primary_key=True)

    tipo_reporte = models.CharField(
        max_length=30,
        choices=TIPO_REPORTE
    )

    fecha_inicio = models.DateField()

    fecha_fin = models.DateField()

    fecha_generacion = models.DateTimeField(auto_now_add=True)

    archivo = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    class Meta:
        db_table = 'reporte'

    def __str__(self):
        return f"{self.tipo_reporte} - {self.fecha_generacion}"