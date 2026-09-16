from django.core.management.base import BaseCommand, CommandError
from django.db import connection

from .instalar_seguridad_bd import PROTEGIDAS


class Command(BaseCommand):
    help = 'Retira temporalmente los triggers de protección de FARMACOR.'

    def handle(self, *args, **options):
        if connection.vendor != 'mysql':
            raise CommandError('Este comando está diseñado para MySQL.')

        with connection.cursor() as cursor:
            for tabla in PROTEGIDAS:
                safe = ''.join(c if c.isalnum() else '_' for c in tabla)
                for sufijo in ('bi', 'bu', 'bd'):
                    cursor.execute(f'DROP TRIGGER IF EXISTS `farmacor_{sufijo}_{safe}`')

        self.stdout.write(self.style.SUCCESS(
            'Triggers retirados. La tabla seguridad_intentos_bd se conserva.'
        ))
