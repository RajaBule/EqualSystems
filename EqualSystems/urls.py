"""
URL configuration for EqualSystems project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from ESdashboard import views

urlpatterns = [
    path('admin/', admin.site.urls),
    #path('update-counter/', views.update_counter, name='update_counter'),
    path('', views.home, name='home'),
    path('app/', views.cpanel, name='cpanel'),
    path('billing/', views.billing, name='billing'),
    path('control_relay/', views.control_relay, name='control_relay'),
    path('signup/', views.sign_up, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('set_all_relays_off/', views.set_all_relays_off, name='set_all_relays_off'),
    path('tables/start/<int:table_id>/', views.start_table, name='start_table'),
    path('end_of_day_sales_summary/', views.end_of_day_sales_summary, name='end_of_day_sales_summary'),
    path('start_day', views.start_day, name='start_day'),
    path('add_purchase/', views.add_purchase, name='add_purchase'),
    path('get-bill-items/<int:table_id>/', views.get_bill_items, name='get_bill_items'),
    path('pay-bill/<int:bill_id>/', views.pay_bill, name='process_payment'),
    path('get-bill-data/<int:bill_id>/', views.get_bill_data, name='get_bill_data'),
    path('admin_panel/', views.adminp, name='adminp'),
    path('admin_panel/get-chart-data/', views.get_chart_data, name='get_chart_data'),
    #path('update_table_state/', views.update_table_state, name='update_table_state'),
    path('admin_panel/inventory/', views.inventory, name='inventory'),
    path('admin_panel/inventory/add/', views.add_inventory, name='add_inventory'),
    path('admin_panel/inventory/edit/<int:item_id>/', views.edit_inventory, name='edit_inventory'),
    path('admin_panel/inventory/delete/<int:item_id>/', views.delete_inventory, name='delete_inventory'),
    path('admin_panel/reports/', views.reports, name='reports'),
    path('admin_panel/reports/data/', views.reports_data, name='reports_data'),
    path('print_receipt/<int:bill_id>/', views.print_receipt_view, name='print_receipt'),
    path('admin_panel/settings', views.settings, name='settings'),
    path('admin_panel/settings/add_rate/', views.add_rate, name='add_rate'),
    path('admin_panel/settings/edit_rate/<int:rate_id>/', views.edit_rate, name='edit_rate'),
    path('admin_panel/settings/delete_rate/<int:rate_id>/', views.delete_rate, name='delete_rate'),
]
