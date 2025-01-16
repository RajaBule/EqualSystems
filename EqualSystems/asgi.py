"""
ASGI config for EqualSystems project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from ESdashboard import consumers  # Replace with your app and consumer

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'EqualSystems.settings')

# Define WebSocket URL patterns
websocket_urlpatterns = [
    path('ws/tables/', consumers.TableConsumer.as_asgi()),  # Replace with your WebSocket consumer
]

# ASGI application
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
