# Generated by Django 4.2.4 on 2024-09-24 15:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ESdashboard', '0007_table_relay_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='table',
            name='ratePmin',
            field=models.PositiveIntegerField(default=250),
        ),
    ]
