from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.conf import settings
from .models import Table, BillItem, BusinessDay, Bill
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_tables_for_new_user(sender, instance, created, **kwargs):
    if created:
        number_of_tables = instance.number_of_tables
        for table_number in range(1, number_of_tables + 1):
            Table.objects.create(
                
                user=instance,
                table_number=table_number,
                relay_id=table_number-1,
                #duration=timedelta(hours=0),
                #time_left=timedelta(hours=0),
                #total_billing=0.00
            )

@receiver(pre_save, sender=BillItem)
def update_linetot(sender, instance, **kwargs):
    if instance.product_name == 'Table':
        instance.linetot = (instance.quantity * instance.price) + 1000
    else:
        instance.linetot = instance.quantity * instance.price
    print("Signal Line Total: ", instance.linetot)

@receiver(post_save, sender=BillItem)
def update_bill_total(sender, instance, **kwargs):
    bill = instance.bill
    # Calculate the total amount of all line items
    total_amount = sum(item.linetot for item in bill.items.all())
    # Apply the discount
    discount = (bill.percentdiscount / 100) * total_amount
    discounted_total = total_amount - discount
    # Update the total amount in the Bill model
    bill.total_amount = discounted_total
    bill.save()

@receiver(post_save, sender=BusinessDay)
def update_bill_total(sender, instance, **kwargs):
    start_date = instance.start_date
    end_date = instance.end_date if instance.end_date else timezone.now()

    # Get all bills within the business day
    bills = Bill.objects.filter(user=instance.user,business_day=instance, start_time__gte=start_date, end_time__lte=end_date)

    # Total sales: Sum of total_amount from all related Bills
    total_sales = bills.aggregate(Sum('total_amount'))['total_amount__sum'] or 0

    total_items_sold = BillItem.objects.filter(bill__in=bills).aggregate(Sum('quantity'))['quantity__sum'] or 0

    # Total transactions: Count of bills within the business day
    total_transactions = bills.count()

    # Update the BusinessDay instance with the calculated totals
    BusinessDay.objects.filter(id=instance.id).update(
        total_sales=total_sales,
        total_items_sold=total_items_sold,
        total_transactions=total_transactions
    )
