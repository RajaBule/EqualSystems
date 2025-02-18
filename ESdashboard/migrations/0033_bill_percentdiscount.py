# Generated by Django 4.2.4 on 2025-01-16 14:29

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ESdashboard', '0032_rate_per_minute_rate'),
    ]

    operations = [
        migrations.AddField(
            model_name='bill',
            name='percentdiscount',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Enter the percentage as a decimal value (e.g., 25.50 for 25.5%).', max_digits=5),
            preserve_default=False,
        ),
    ]
