from django.apps import AppConfig


class AlertasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'alertas'

    def ready(self):
        from . import db_session  # noqa: F401
