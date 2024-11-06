from django.apps import AppConfig

class EsdashboardConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ESdashboard'
    def ready(self):
        import ESdashboard.signals