from django.db import models


class UsuarioSistema(models.Model):

    ROLES = [
        ("Administrador", "Administrador"),
        ("Farmacéutico", "Farmacéutico"),
    ]

    nombre = models.CharField(
        max_length=100
    )

    usuario = models.CharField(
        max_length=50,
        unique=True
    )

    correo = models.EmailField(
        unique=True
    )

    password = models.CharField(
        max_length=255
    )

    rol = models.CharField(
        max_length=20,
        choices=ROLES,
        default="Farmacéutico"
    )

    estado = models.BooleanField(
        default=True
    )

    fecha_registro = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.usuario