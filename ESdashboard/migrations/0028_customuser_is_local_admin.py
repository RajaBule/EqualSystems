# Generated by Django 4.2.4 on 2024-11-08 17:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ESdashboard', '0027_inventory_cost_alter_inventory_price'),
    ]

    operations = [
        migrations.AddField(
            model_name='customuser',
            name='is_local_admin',
            field=models.BooleanField(default=False),
        ),
    ]
