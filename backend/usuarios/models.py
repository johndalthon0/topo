from django.db import models

class Usuario(models.Model):

    nombre = models.CharField(max_length=100)

    usuario = models.CharField(
        max_length=50,
        unique=True
    )

    correo = models.EmailField(
        unique=True
    )

    password = models.CharField(max_length=255)

    fecha_registro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.usuario