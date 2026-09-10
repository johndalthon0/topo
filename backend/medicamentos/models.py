from django.db import models


class Medicamento(models.Model):

    codigo = models.CharField(max_length=30, unique=True)

    nombre = models.CharField(max_length=200)

    categoria = models.CharField(max_length=100)

    laboratorio = models.CharField(max_length=150)

    lote = models.CharField(max_length=100)

    fecha_vencimiento = models.DateField()

    precio_compra = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    precio_venta = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    stock = models.IntegerField(default=0)

    stock_minimo = models.IntegerField(default=0)

    descripcion = models.TextField(
        blank=True,
        null=True
    )

    fecha_registro = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:

        db_table = "medicamentos"

        ordering = ["nombre"]

        verbose_name = "Medicamento"

        verbose_name_plural = "Medicamentos"

    def __str__(self):

        return self.nombre