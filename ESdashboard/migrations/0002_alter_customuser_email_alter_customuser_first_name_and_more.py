# Generated by Django 4.2.4 on 2024-09-18 16:38

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ESdashboard', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customuser',
            name='email',
            field=models.EmailField(max_length=254, unique=True),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='first_name',
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name='customuser',
            name='last_name',
            field=models.CharField(max_length=100),
        ),
    ]
