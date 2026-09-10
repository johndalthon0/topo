from django.db import models

from medicamentos.models import Medicamento
from usuarios_sistema.models import UsuarioSistema


# ============================================================
# VENTA
# ============================================================

class Venta(models.Model):

    usuario = models.ForeignKey(
        UsuarioSistema,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    cliente = models.CharField(
        max_length=150,
        blank=True,
        default="Consumidor Final"
    )

    fecha = models.DateField(
        auto_now_add=True
    )

    numero_venta = models.CharField(
        max_length=50
    )

    total = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    estado = models.CharField(
        max_length=20,
        default="COMPLETADA"
    )

    observacion = models.TextField(
        blank=True,
        null=True
    )

    # ========================================================
    # DATOS DE ANULACIÓN
    # ========================================================

    motivo_anulacion = models.TextField(
        blank=True,
        null=True
    )

    fecha_anulacion = models.DateTimeField(
        blank=True,
        null=True
    )

    anulado_por = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    # ========================================================
    # CORRECCIÓN
    # ========================================================
    # Si esta venta corrige una venta anulada,
    # aquí se conserva la referencia a la venta original.
    # ========================================================

    venta_origen = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="correcciones"
    )

    # ========================================================
    # BLOCKCHAIN DE LA OPERACIÓN ORIGINAL
    # ========================================================

    hash_operacion = models.CharField(
        max_length=64,
        blank=True,
        null=True
    )

    transaction_hash = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    block_number = models.BigIntegerField(
        blank=True,
        null=True
    )

    cuenta_blockchain = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    def __str__(self):
        return self.numero_venta


# ============================================================
# DETALLE DE VENTA
# ============================================================

class DetalleVenta(models.Model):

    venta = models.ForeignKey(
        Venta,
        on_delete=models.CASCADE
    )

    medicamento = models.ForeignKey(
        Medicamento,
        on_delete=models.CASCADE
    )

    cantidad = models.IntegerField()

    precio_venta = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    subtotal = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    def __str__(self):
        return self.medicamento.nombre


# ============================================================
# HISTORIAL BLOCKCHAIN DE VENTAS
# ============================================================
# Permite conservar por separado:
#   VENTA ORIGINAL
#   ANULACIÓN DE VENTA
#   VENTA CORREGIDA
# sin sobrescribir la transacción anterior.
# ============================================================

class RegistroBlockchainVenta(models.Model):

    TIPOS_OPERACION = [
        ("VENTA", "Venta original"),
        ("ANULACION_VENTA", "Anulación"),
        ("CORRECCION_VENTA", "Venta corregida"),
    ]

    venta = models.ForeignKey(
        Venta,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="registros_blockchain"
    )

    tipo_operacion = models.CharField(
        max_length=30,
        choices=TIPOS_OPERACION
    )

    referencia = models.CharField(
        max_length=150
    )

    referencia_original = models.CharField(
        max_length=150,
        blank=True,
        null=True
    )

    motivo = models.TextField(
        blank=True,
        null=True
    )

    usuario = models.CharField(
        max_length=100,
        default="Administrador"
    )

    fecha = models.DateTimeField(
        auto_now_add=True
    )

    estado = models.CharField(
        max_length=30,
        default="VERIFICADO"
    )

    hash_operacion = models.CharField(
        max_length=64,
        blank=True,
        null=True
    )

    transaction_hash = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    block_number = models.BigIntegerField(
        blank=True,
        null=True
    )

    cuenta_blockchain = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    class Meta:
        ordering = ["-id"]

    def __str__(self):
        return f"{self.get_tipo_operacion_display()} - {self.referencia}"