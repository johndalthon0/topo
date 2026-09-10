from django.db import models
from medicamentos.models import Medicamento


# ============================================================
# PROVEEDOR
# ============================================================

class Proveedor(models.Model):

    nombre = models.CharField(
        max_length=150
    )

    telefono = models.CharField(
        max_length=20
    )

    correo = models.EmailField()

    direccion = models.TextField()

    def __str__(self):
        return self.nombre


# ============================================================
# COMPRA
# ============================================================

class Compra(models.Model):

    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.CASCADE
    )

    fecha = models.DateField(
        auto_now_add=True
    )

    factura = models.CharField(
        max_length=50
    )

    total = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    estado = models.CharField(
        max_length=20,
        default="RECIBIDA"
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
    # Si esta compra corrige a otra compra anulada,
    # aquí se guarda la compra original.

    compra_origen = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='correcciones'
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

        return self.factura


# ============================================================
# DETALLE DE COMPRA
# ============================================================

class DetalleCompra(models.Model):

    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE
    )

    medicamento = models.ForeignKey(
        Medicamento,
        on_delete=models.CASCADE
    )

    cantidad = models.IntegerField()

    precio_compra = models.DecimalField(
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
# HISTORIAL BLOCKCHAIN
# ============================================================
# Esta tabla permite conservar:
#
# COMPRA ORIGINAL
# ANULACIÓN
# COMPRA CORREGIDA
#
# sin reemplazar el registro anterior.
# ============================================================

class RegistroBlockchain(models.Model):

    TIPOS_OPERACION = [

        (
            'COMPRA',
            'Compra original'
        ),

        (
            'ANULACION_COMPRA',
            'Anulación'
        ),

        (
            'CORRECCION_COMPRA',
            'Compra corregida'
        ),

        (
            'VENTA',
            'Venta original'
        ),

        (
            'ANULACION_VENTA',
            'Anulación de venta'
        ),

        (
            'CORRECCION_VENTA',
            'Venta corregida'
        ),

    ]


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
        default='Administrador'
    )


    fecha = models.DateTimeField(
        auto_now_add=True
    )


    estado = models.CharField(
        max_length=30,
        default='VERIFICADO'
    )


    # ========================================================
    # DATOS REALES DEVUELTOS POR BLOCKCHAIN
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


    # ========================================================
    # COMPRA RELACIONADA
    # ========================================================

    compra = models.ForeignKey(
        Compra,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='registros_blockchain'
    )


    class Meta:

        ordering = ['-id']


    def __str__(self):

        return (
            self.get_tipo_operacion_display()
            + ' - '
            + self.referencia
        )