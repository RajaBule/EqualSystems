from celery import shared_task
from django.utils.timezone import now
from .models import Table

@shared_task
def manage_timers():
    tables = Table.objects.all()
    current_time = now()
    for table in tables:
        # Handle countdown timer expiration
        if table.set_time and table.set_time <= current_time:
            
            table.countdown_end = None  # Clear countdown timer
            table.save()


from datetime import timedelta
import math
from django.utils import timezone
from billiards.models import Table, Bill, BillItem, Rate

def stop_table(user, table_id, relay_id):
    """
    Handles turning off a table and processing billing logic.
    """
    try:
        # Fetch the table and related user details
        table = Table.objects.get(user=user, table_number=table_id)
        local_owner = table.user.filter(is_owner=True).first()
        
        # Fetch the current bill for the table
        bill = Bill.objects.get(user=local_owner, start_time=table.start_time)
        time_now = timezone.now()
        
        # Set the table's end time and calculate duration
        table.end_time = time_now
        if table.start_time:
            table.duration = table.end_time - table.start_time
        else:
            table.duration = timedelta(0)
        
        # Stop the table and reset attributes
        table.state = 0  # Set state to stopped
        bill.end_time = time_now
        bill.duration = table.duration

        # Use rate from the table or a default rate
        if table.ratePmin:
            rate = table.ratePmin
        else:
            rate = Rate.objects.get(id=0)
            table.ratePmin = rate
        
        # Calculate billing
        duration_minutes = math.ceil(table.duration.total_seconds() / 60)  # Convert to minutes
        if duration_minutes > 0:
            BillItem.objects.create(
                user=local_owner,
                bill=bill,
                product_name='Table',
                quantity=duration_minutes,
                price=rate.per_minute_rate,
            )
        
        # Reset the table fields
        table.duration = None
        table.start_time = None
        table.set_time = None
        table.total_billing = 0
        table.end_time = None
        table.current_bill = None
        table.save()

        # Save the bill changes
        bill.save()

        # Return success status for further processing (e.g., notifying ESP32)
        return {
            'status': 'success',
            'message': 'Table turned off successfully',
            'updated_state': table.state,
        }
    except Table.DoesNotExist:
        return {'status': 'error', 'message': 'Table not found'}
    except Bill.DoesNotExist:
        return {'status': 'error', 'message': 'Bill not found'}
    except Exception as e:
        return {'status': 'error', 'message': f'An unexpected error occurred: {str(e)}'}
