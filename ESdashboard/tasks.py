from celery import shared_task
from .models import Table
from datetime import timedelta
import math
from django.http import JsonResponse
from django.utils import timezone
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from ESdashboard.models import Table, Bill, BillItem, Rate



@shared_task
def update_table_durations():
    """Update the duration for active tables."""
    current_time = timezone.now()
    tables = Table.objects.filter(state=1, start_time__isnull=False)

    for table in tables:
        elapsed_time = (current_time - table.start_time).total_seconds()
        table.duration = int(elapsed_time)
        table.save()
