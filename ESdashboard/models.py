from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils import timezone


class CustomUser(AbstractUser):
    number_of_tables = models.IntegerField(default=0)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    def __str__(self):
        return self.username
    
class Rate(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    per_minute_rate = models.PositiveIntegerField()  # The rate per minute (e.g., 500)

    def __str__(self):
        return f"{self.name} - {self.per_minute_rate} per minute"    

class Table(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    table_number = models.PositiveIntegerField()
    ratePmin = models.ForeignKey(Rate, on_delete=models.SET_NULL, null=True, blank=True)
    relay_id = models.PositiveIntegerField()
    start_time = models.DateTimeField(auto_now_add=True, null=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True)
    set_time = models.DurationField(null=True)
    state = models.IntegerField(default=0)
    total_billing = models.DecimalField(max_digits=20, decimal_places=2)

    def get_duration(self):
        if self.state == 1:
            duration = (timezone.now() - self.start_time).total_seconds()
            hours, remainder = divmod(duration, 3600)
            minutes, seconds = divmod(remainder, 60)
            return f"{int(hours)}h {int(minutes)}m {int(seconds)}s"
        return "0h 0m 0s"
    
    def __str__(self):
        return f"Table {self.table_number} for {self.user.username}"

class InvCatagory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    def __str__(self):
        return f"{self.name}"


class Inventory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product_name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=20, decimal_places=2)
    stock = models.PositiveIntegerField()
    catagory = models.ForeignKey(InvCatagory, on_delete=models.CASCADE, related_name='catagories')

    def __str__(self):
        return f"{self.product_name} ({self.stock} in stock)"



class BusinessDay(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    total_sales = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)
    total_items_sold = models.PositiveIntegerField(default=0)
    total_transactions = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Business Day {self.start_date.strftime('%Y-%m-%d')} - {self.user.username}"    

class Bill(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    table = models.ForeignKey(Table, on_delete=models.CASCADE, related_name='bills')
    business_day = models.ForeignKey(BusinessDay, on_delete=models.CASCADE, related_name='bills', null=True, blank=True)
    start_time = models.DateTimeField(auto_now_add=True)
    end_time = models.DateTimeField(null=True, blank=True)
    duration = models.DurationField(null=True)
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0.00)
    is_paid = models.BooleanField(default=False)
    customer_name = models.CharField(max_length=255, null=True, blank=True)  # Can be empty if not provided
    def __str__(self):
        return f"Bill for Table {self.table.table_number} - {'Paid' if self.is_paid else 'Unpaid'}"

class BillItem(models.Model):
    timeadded = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    #business_day = models.ForeignKey(BusinessDay, on_delete=models.CASCADE, related_name='billitem')
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name='items')
    product_name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=20, decimal_places=2)
    linetot = models.DecimalField(max_digits=20, decimal_places=2, editable=False)  # linetot is not editable by users
    def __str__(self):
        return f"{self.quantity} x {self.product_name} for Bill {self.bill.id}"
