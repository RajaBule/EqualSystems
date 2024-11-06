from django.contrib import admin
from .models import CustomUser, Table, BillItem, Bill, Inventory

# Register your models here
admin.site.register(CustomUser)
admin.site.register(Table)
admin.site.register(BillItem)
admin.site.register(Bill)
admin.site.register(Inventory)
