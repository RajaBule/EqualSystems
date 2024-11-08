from django.shortcuts import render
from django.http import (HttpResponse)
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import requests
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.forms import UserCreationForm
from .models import CustomUser
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from .models import Table, BusinessDay, Bill, BillItem, Rate, InvCatagory, Inventory
from datetime import timedelta
import json
from django.utils import timezone
from pytz import timezone as tz
from django.db.models import Sum, DateTimeField
from django.db.models.functions import TruncMinute, ExtractMonth, TruncMonth, TruncWeek
import serial
from PIL import Image

timezonejkt = tz('Asia/Jakarta')
counter_value = 0
tbtotal = 0

ESP32_URL = 'http://192.168.18.90/relay/'

# TANEM - 192.168.18.90
# HOME - ESP32_URL = 'http://192.168.0.104/relay/'

#Klotok
#  - ESP32_URL = 'http://192.168.18.243/relay/'

#ESP32_URL = 'http://192.168.1.165/relay/'
# - EQUAL gateway: 192.168.1.1
#const char* ssid = "De tower Bar";
#const char* password = "tower1234";



def sign_up(request):
    if request.method == 'POST':
        firstname = request.POST.get('firstname')
        lastname = request.POST.get('lastname')
        tablecount = int(request.POST.get('tablecount'))
        email = request.POST.get('email')
        password = request.POST.get('password')
        
        UserModel = get_user_model()
        
        if UserModel.objects.filter(email=email).exists():
            return render(request, 'ESdashboard/signup.html', {'error': 'Email already exists'})
        
        #create the user
        user = UserModel.objects.create_user(
        username=email,  # Email used as username
        email=email,
        password=password,
        first_name=firstname,
        last_name=lastname,
        number_of_tables=tablecount  # number_of_tables should go here
        )

        # Set the number of tables in CustomUser
        user.number_of_tables = tablecount
        user.save()

        #create Table Instances for user
        for i in range(1, int(tablecount) + 1):
            Table.objects.create(
                user=user,
                table_number=i,
                duration=timedelta(hours=0),  # Default duration; adjust as needed
                time_left=timedelta(hours=0),  # Default time_left; adjust as needed
                total_billing=0.00  # Default billing; adjust as needed
            )


        login(request, user)
        return redirect('home')  # Ensure 'home' is a valid URL pattern name
    
    return render(request, 'ESdashboard/signup.html')

def login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            email = form.cleaned_data.get('username')  # Use email as the username
            password = form.cleaned_data.get('password')
            user = authenticate(request, username=email, password=password)
            if user is not None:
                login(request, user)
                return redirect('home')  # Adjust this to your desired URL
    else:
        form = AuthenticationForm()
    return render(request, 'ESdashboard/login.html', {'form': form})

def logout_view(request):
    auth_logout(request)
    return redirect('login')

# Create your views here.
def home(request):
    return render(request, "ESdashboard\index.html")

@login_required
def cpanel(request):
    # Get all the tables associated with the logged-in user
    user = request.user
    user_tables = Table.objects.filter(user=request.user)
    business_day = BusinessDay.objects.filter(user=request.user, end_date__isnull=True).first()
    user_rates = Rate.objects.filter(user=request.user)
    categories = InvCatagory.objects.filter(user=user).prefetch_related('catagories')  # Prefetch related inventory items
    for table in user_tables:
        if table.state == 1:
            
            time_diff = timezone.now() - table.start_time
            time_in_milliseconds = time_diff.total_seconds() * 1000
            table.duration = timedelta(milliseconds=time_in_milliseconds)
            print(f"Table {table.table_number} duration: {table.duration}")

        # Save the updated table duration
        table.save()
    if not business_day:
        # Set day check value to ture/false
        day_start = 'False'
    else:
        day_start = 'True'

    context = {
        'tables': user_tables,
        'started': day_start,
        'user_rates': user_rates,
        'categories': categories,
    }

    return render(request, 'ESdashboard/controlp.html', context)

def billing(request):
    # Get the active business day
    bday = BusinessDay.objects.filter(user=request.user, end_date__isnull=True).first()

    # Fetch all bills for the current business day
    bills = Bill.objects.filter(business_day=bday)

    # For each bill, we will also gather the associated BillItems
    bill_data = []
    for bill in bills:
        bill_items = bill.items.all()  # Fetch the related BillItems using the related_name 'items'
        bill_data.append({
            'bill': bill,
            'items': bill_items,
            'total_amount': bill.total_amount,  # Already calculated in the model
        })

    context = {
        'bills': bill_data,  # Pass bill and item data to the template
    }
    return render(request, "ESdashboard/dsales.html", context)


@csrf_exempt
def control_relay(request):
    if request.method == 'POST':
        tbtotal = 0
        table_id = request.POST.get('table_id')
        relay_id = request.POST.get('relay_id')  # Assuming relay_id is passed in the POST request
        state = int(request.POST.get('state'))  # 0 for stop, 1 for start
        rate_id = request.POST.get('rate_id')
        
        if request.POST.get('set_time'):
            set_time_ms = int(request.POST.get('set_time'))
            set_time = timedelta(milliseconds=set_time_ms)
        else:
            set_time = None
        print('State: ', state)
        print('Rate: ', str(rate_id))
        print('Run Time: ', timezone.now())
        print('Set time: ', set_time)
        
        table = Table.objects.get(table_number=table_id)
        esp32_payload = {
                'relay_id': relay_id,
                'state': state
            }

        if state == 0:  # Stopping the table
            timeNow = timezone.now()
            bill = Bill.objects.get(start_time=table.start_time)
            bill.end_time = timeNow
            
            # Update the end_time
            table.end_time = timeNow
            # Calculate the duration based on the start_time and end_time
            if table.start_time:
                table.duration = table.end_time - table.start_time
                
            else:
                table.duration = 0

            # Update the state
            table.state = 0  # Stopped
            table.ratePmin = Rate.objects.get(id=0)
            bill.duration = table.duration
            table.save()

            duration_minutes = int(table.duration.total_seconds() / 60)  # Convert to minutes
            
            #create bill item for customer's bill to charge for table use
            BillItem.objects.create(
                user=table.user,
                bill=bill,
                product_name='Table',
                quantity=duration_minutes,
                price=table.ratePmin.per_minute_rate,
                
                )
            
            bill.save()
            table.duration = None
            table.start_time = None
            table.set_time = None
            table.save()

            try:
                print('Trying to Contact ESP32')
                esp32_response = requests.post(ESP32_URL, data=esp32_payload)
                esp32_response.raise_for_status()  # Raise an error for bad responses (4xx, 5xx)

                # Parse the response from the ESP32
                esp32_data = esp32_response.json()
                
                print(esp32_data)
                # Return a success response with the updated state and ESP32 response
                return JsonResponse({
                    'status': 'success',
                    'message': 'Table state updated successfully',
                    'updated_state': table.state,
                    'esp32_response': esp32_data  # Optionally include ESP32 response data
                })

            except requests.exceptions.RequestException as e:
                # Handle communication errors with ESP32
                return JsonResponse({
                    'status': 'error',
                    'message': f'Failed to communicate with ESP32: {str(e)}'
                }, status=500)
            
        elif state == 1:
            try:
                if rate_id:
                    
                    rate = Rate.objects.get(id=rate_id)
                    table.ratePmin = rate

                if set_time:
                    table.set_time = set_time
                    
            # Update the table state in the database
                table.state = state
                table.start_time = timezone.now()
                table.save()
                print('data base updated')

            # Send' relay_id and state to ESP32
            
                try:
                    print('Trying to Contact ESP32')
                    esp32_response = requests.post(ESP32_URL, data=esp32_payload)
                    esp32_response.raise_for_status()  # Raise an error for bad responses (4xx, 5xx)

                # Parse the response from the ESP32
                    esp32_data = esp32_response.json()
                
                    print(esp32_data)
                    # Return a success response with the updated state and ESP32 response
                    return JsonResponse({
                        'status': 'success',
                        'message': 'Table state updated successfully',
                        'updated_state': table.state,
                        'esp32_response': esp32_data  # Optionally include ESP32 response data
                    })

                except requests.exceptions.RequestException as e:
                    # Handle communication errors with ESP32
                    return JsonResponse({
                        'status': 'error',
                        'message': f'Failed to communicate with ESP32: {str(e)}'
                    }, status=500)

            except Table.DoesNotExist:
                return JsonResponse({'status': 'error', 'message': 'Table not found'}, status=404)

    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=400)

@csrf_exempt
def set_all_relays_off(request):
    if request.method == 'POST':
        alloffurl = str(ESP32_URL) + 'all/off/'
        try:
            response = requests.post(alloffurl)

            if response.status_code == 200:
                return JsonResponse({'status': 'success', 'message': 'All relays turned off'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Failed to communicate with ESP32'}, status=response.status_code)

        except requests.exceptions.RequestException as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

        

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=400)

def start_table(request, table_id):
    print(table_id)
    table = Table.objects.get(id=table_id)
        
    if request.POST.get('customer_name'):
        customer_name = request.POST.get('customer_name')
    else:
        customer_name = 'NoUser'
        
    print(customer_name)
    # Check for active business day
    business_day = BusinessDay.objects.filter(user=request.user, end_date__isnull=True).first()
    
    if not business_day:
        # Start a new business day
        business_day = BusinessDay.objects.create(user=request.user)

    # Create a new bill for this table
    new_bill = Bill.objects.create(user=table.user, table=table, business_day=business_day, customer_name=customer_name, total_amount=0.00)
    new_bill.start_time = table.start_time
    
    new_bill.save()
    return JsonResponse({'status': 'success'})

def end_of_day_sales_summary(request):
    if request.method == 'POST':
        try:
            set_all_relays_off(request)
            # Set all tables' states to 0
            Table.objects.all().update(state=0)
            Table.objects.all().update(end_time = timezone.now())
            Table.objects.all().update(start_time = None)
            Table.objects.all().update(duration = None)
            Table.objects.all().update(ratePmin = Rate.objects.get(id=0))
            # Update the end time of the current BusinessDay
            business_day = BusinessDay.objects.filter(end_date__isnull=True).last()
            if business_day:
                business_day.end_date = timezone.now()
                business_day.save()

            return JsonResponse({'success': True})

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)})
    
    return JsonResponse({'success': False, 'error': 'Invalid request method'})

def start_day(request):
    if request.method == 'POST':
        # Check if there is an ongoing business day for the user
        ongoing_day = BusinessDay.objects.filter(user=request.user, end_date=None).exists()
        
        if ongoing_day:
            return JsonResponse({'status': 'error', 'message': 'There is already an ongoing business day.'}, status=400)
        else:
            for table in Table.objects.filter(user=request.user):
                table.state = 0
        # Logic to start the business day
        BusinessDay.objects.create(user=request.user)

        return JsonResponse({'status': 'success', 'message': 'Business day started.'})
    return JsonResponse({'status': 'error', 'message': 'Invalid request.'}, status=400)

@csrf_exempt
def add_purchase(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        table_id = data.get('table_id')
        item_name = data.get('item')
        quantity = data.get('quantity')

        try:
            # Get the table
            table = Table.objects.get(table_number=table_id)
            
            # Check if there is an open bill for the table
            bill = Bill.objects.filter(table=table, is_paid=False, end_time=None).first()
            
            # If no open bill, create a new one
            if not bill:
                return JsonResponse({'status': 'error', 'message': 'No Bill'}, status=400)
            
            # Get the item from the inventory
            inventory_item = Inventory.objects.get(product_name=item_name, user=table.user)
            
            # Create a new BillItem for the purchase
            bill_item = BillItem.objects.create(
                user=table.user,
                bill=bill,
                product_name=inventory_item.product_name,
                quantity=int(quantity),
                price=inventory_item.price
            )
            
            # Update the total amount of the bill
            
            bill.save()
            
            return JsonResponse({'status': 'success', 'bill_item_id': bill_item.id})
        except Table.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Table not found'}, status=404)
        except Inventory.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Item not found in inventory'}, status=404)
        except ValueError:
            return JsonResponse({'status': 'error', 'message': 'Invalid data'}, status=400)
    return JsonResponse({'status': 'error', 'message': 'Invalid request'}, status=405)

def get_bill_items(request, table_id):
    # Assuming that table_id corresponds to the Bill and BillItems
    try:
        table = Table.objects.get(table_number=table_id)
        # Get the current bill for the table
        bill = Bill.objects.get(table__id=table.id, end_time=None)  # Adjust status if needed

        # Get all bill items for this bill
        bill_items = BillItem.objects.filter(bill=bill)
        items_data = [{
            'product_name': item.product_name,
            'quantity': item.quantity,
            'total': str(item.linetot)  # Convert Decimal to string for JSON serialization
        } for item in bill_items]

        # Total for the bill
        total = str(bill.total_amount)

        # Return data as JSON
        return JsonResponse({
            'items': items_data,
            'total': total
        })
    except Bill.DoesNotExist:
        # Handle case where no bill is found
        return JsonResponse({
            'items': [],
            'total': '0'
        }, status=404)
    
def get_bill_data(request, bill_id):
    # Fetch the bill and associated items
    bill = get_object_or_404(Bill, id=bill_id)
    items = BillItem.objects.filter(bill=bill)
    # Build the response data
    bill_data = {
        'table_number': bill.table.table_number,
        'items': [{
            'product_name': item.product_name,
            'quantity': item.quantity,
            'line_total': item.linetot
        } for item in items],
        'total_amount': bill.total_amount,
        'is_paid': bill.is_paid,
    }
    print(bill_data)
    # Return as JSON
    return JsonResponse(bill_data)

def pay_bill(request, bill_id):
    if request.method == "POST":
        try:
            bill = Bill.objects.get(id=bill_id)
            bill.is_paid = True
            bill.save()
            return JsonResponse({'status': 'success'})
        except Bill.DoesNotExist:
            return JsonResponse({'status': 'error', 'message': 'Bill not found'}, status=404)
        
from django.utils.dateformat import format

@login_required
def adminp(request):
    user = request.user
    current_time = timezone.now()

    # Get the most recent business day
    business_day = BusinessDay.objects.filter(user=user).order_by('-start_date').first()

    if business_day and not business_day.end_date:
        # If there's an open business day, filter the bills accordingly
        start_of_day = business_day.start_date
        end_of_day = current_time  # Use current time if the day hasn't ended yet
    elif business_day:
        # If the business day has ended
        start_of_day = business_day.start_date
        end_of_day = business_day.end_date
    else:
        # Default case: If no business day exists, show data for the current day
        start_of_day = timezone.localtime(current_time).replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = current_time

    # Filter bills by the start and end of the business day
    bills = Bill.objects.filter(user=user, start_time__gte=start_of_day, start_time__lte=end_of_day)

    # Calculate total income for the business day
    total_income = sum(bill.total_amount for bill in bills)

    # Count closed bills
    closed_bills = bills.filter(is_paid=True).count()

    # Count active tables (based on table state)
    active_tables = Table.objects.filter(user=user, state__gt=0).count()

    # Count active bills (bills that are not yet paid)
    active_bills = bills.filter(is_paid=False).count()

    # Prepare the data for the chart
    bills_data = list(bills.values_list('total_amount', flat=True))  # Income data
    bills_labels = [format(bill.start_time, 'H:i') for bill in bills]  # Time labels for charting

    context = {
        'total_income': total_income,
        'closed_bills': closed_bills,
        'active_tables': active_tables,
        'active_bills': active_bills,
        'bills_labels': bills_labels,  # Pass labels to the template
        'bills_data': bills_data,  # Pass data to the template
    }

    return render(request, 'ESdashboard/today.html', context)

@login_required
def get_chart_data(request):
    user = request.user
    current_time = timezone.now()

    # Get the most recent business day
    business_day = BusinessDay.objects.filter(user=user).order_by('-start_date').first()

    if business_day and not business_day.end_date:
        start_of_day = business_day.start_date
        end_of_day = current_time
    elif business_day:
        start_of_day = business_day.start_date
        end_of_day = business_day.end_date
    else:
        start_of_day = timezone.localtime(current_time).replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = current_time

    # Aggregate closed bills into 30-minute intervals
    bills = (Bill.objects
             .filter(user=user, end_time__gte=start_of_day, end_time__lte=end_of_day, is_paid=True)
             .annotate(interval=TruncMinute('end_time'))
             .values('interval')
             .annotate(total_income=Sum('total_amount'))
             .order_by('interval'))

    # Prepare data for the chart
    bills_data = []
    bills_labels = []

    # Create a dictionary to hold income for each 30-minute interval
    income_dict = {}
    for bill in bills:
        interval = bill['interval']
        total_income = bill['total_income']
        # Round the interval to the nearest 30 minutes
        rounded_interval = interval.replace(second=0, microsecond=0, minute=(interval.minute // 10) * 10)
        if rounded_interval in income_dict:
            income_dict[rounded_interval] += total_income
        else:
            income_dict[rounded_interval] = total_income

    # Prepare labels and data for the chart
    for interval, total_income in sorted(income_dict.items()):
        bills_labels.append(interval.strftime('%H:%M'))
        bills_data.append(total_income)

    return JsonResponse({
        'labels': bills_labels,
        'data': bills_data,
    })

@login_required
def inventory(request):
    # Fetch the inventory items for the logged-in user
    inventory_items = Inventory.objects.filter(user=request.user)
    context = {'inventory_items': inventory_items}
    return render(request, 'ESdashboard/inventory.html', context)

@login_required
def add_inventory(request):
    if request.method == "POST":
        product_name = request.POST['product_name']
        stock = request.POST['stock']
        price = request.POST['price']
        cost = request.POST['cost']
        catagory_id = request.POST['catagory']
        catagory = get_object_or_404(InvCatagory, id=catagory_id, user=request.user)
        Inventory.objects.create(user=request.user, product_name=product_name, stock=stock, cost=cost, price=price, catagory=catagory)
    return redirect('inventory')

@login_required
def edit_inventory(request, item_id):
    item = get_object_or_404(Inventory, id=item_id, user=request.user)
    if request.method == "POST":
        item.product_name = request.POST['product_name']
        item.stock = request.POST['stock']
        item.price = request.POST['price']
        item.cost = request.POST['cost']
        catagory_id = request.POST['catagory']
        item.catagory = get_object_or_404(InvCatagory, id=catagory_id, user=request.user)
        item.save()
    return redirect('inventory')

@login_required
def delete_inventory(request, item_id):
    item = get_object_or_404(Inventory, id=item_id, user=request.user)
    item.delete()
    return redirect('inventory')

def reports(request):
    # Get the current year
    current_year = timezone.now().year

    # Query BusinessDay model and aggregate the total sales by month
    monthly_sales = BusinessDay.objects.filter(start_date__year=current_year) \
        .annotate(month=ExtractMonth('start_date')) \
        .values('month') \
        .annotate(total_sales=Sum('total_sales')) \
        .order_by('month')

    # Prepare data for the chart
    chart_data = {
        'labels': [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
        ],
        'datasets': [{
            'label': 'Income',
            'backgroundColor': '#2d2c38',
            'borderColor': '#19f5aa',
            'borderWidth': 1,
            'data': [0] * 12  # Initialize all months with 0
        }]
    }

    # Populate the data from the database and convert to float
    for entry in monthly_sales:
        month = entry['month'] - 1  # month is 1-based, so subtract 1 for 0-based index
        chart_data['datasets'][0]['data'][month] = float(entry['total_sales']) if entry['total_sales'] is not None else 0
    return render(request, 'ESdashboard/reports.html',{'chart_data': chart_data})

def reports_data(request):
    if request.method == "POST":
        data = json.loads(request.body)
        timeframe = data.get('timeframe')
        start_date = data.get('start_date')
        end_date = data.get('end_date')

        # Process the selected timeframe
        if timeframe == 'week':
            # Get data for the selected week(s)
            queryset = BusinessDay.objects.filter(start_date__gte=start_date, end_date__lte=end_date) \
                                          .annotate(week=TruncWeek('start_date')) \
                                          .values('week') \
                                          .annotate(total_sales=Sum('total_sales')) \
                                          .order_by('week')
        elif timeframe == 'month':
            # Get data for the selected month(s)
            queryset = BusinessDay.objects.filter(start_date__gte=start_date, end_date__lte=end_date) \
                                          .annotate(month=TruncMonth('start_date')) \
                                          .values('month') \
                                          .annotate(total_sales=Sum('total_sales')) \
                                          .order_by('month')
        elif timeframe == 'custom':
            # Custom range of dates
            queryset = BusinessDay.objects.filter(start_date__gte=start_date, end_date__lte=end_date) \
                                          .annotate(month=TruncMonth('start_date')) \
                                          .values('month') \
                                          .annotate(total_sales=Sum('total_sales')) \
                                          .order_by('month')

        # Prepare data for the chart
        labels = [str(item['week']) if timeframe == 'week' else item['month'].strftime('%B') for item in queryset]
        revenue = [item['total_sales'] for item in queryset]

        return JsonResponse({'labels': labels, 'revenue': revenue})

    return JsonResponse({'error': 'Invalid request'}, status=400)




def print_receipt_view(request, bill_id):
    # Get the bill and items for the specified bill_id
    bill = get_object_or_404(Bill, id=bill_id)
    items = BillItem.objects.filter(bill=bill)

    # Configure serial port for Bluetooth printer
    #ser = serial.Serial(port='COM9', baudrate=9600, bytesize=serial.EIGHTBITS, parity=serial.PARITY_NONE, stopbits=serial.STOPBITS_ONE)
    #Printer Settings
    ser = serial.Serial(
        port='COM9',  # Update this to match the COM port shown in Device Manager
        baudrate=9600,  # Check your printer’s manual in case this is different
        bytesize=serial.EIGHTBITS,
        parity=serial.PARITY_NONE,
        stopbits=serial.STOPBITS_ONE,
        timeout=1
    )
    try:
        # Initialize printer
        ser.write(b'\x1b\x40')  # ESC @ - initialize/reset printer

        print_image('ESdashboard\\static\\ESdashboard\img\\reciept.png', ser)

        # Print line separator
        ser.write(b'-' * 32 + b'\n')

        # Print each item in the bill
        for item in items:
            name = item.product_name[:16]  # Limit name to fit width
            qty = str(item.quantity)
            total = f'{item.linetot:.2f}'  # Format price as 2 decimal points
            line = f"{name:<16} {qty:<4} {total:>8}\n"
            ser.write(line.encode('utf-8'))

        # Print total amount
        ser.write(b'-' * 32 + b'\n')
        ser.write(f'TOTAL          {bill.total_amount:.2f}\n'.encode('utf-8'))

        # Print footer
        ser.write(b'\n\n\n')  # Feed paper
        ser.write(b'\x1b\x21\x01')  # ESC ! - select print mode
        ser.write(b'\x1b\x21\x08')  # ESC ! - turn on bold
        ser.write(b'Customer Receipt\n')
        ser.write(b'\x1b\x21\x00')  # ESC ! - turn off bold
        
        ser.write(b'Thank you for your purchase!\n')

        # Feed and cut the paper
        ser.write(b'\n\n\n')  # Feed paper
        ser.write(b'\x1d\x56\x42\x00')  # ESC i - cut paper

        # Close the serial connection
        ser.close()

        # Return success response
        return JsonResponse({'success': True})

    except Exception as e:
        # Close serial on error
        ser.close()
        print("Printing error:", e)
        return JsonResponse({'success': False, 'error': str(e)})
    
def print_image(image_path, ser):
    # Load and convert the image to black & white
    img = Image.open(image_path).convert('1')  # '1' for 1-bit pixels (black and white)
    
    # Resize to printer width (adjust width as per your printer’s specs)
    img = img.resize((384, int(384 * img.height / img.width)))
    
    # Start printing commands
    ser.write(b'\x1b\x40')  # Initialize the printer
    ser.write(b'\x1d\x76\x30\x00' + bytes([img.width // 8, 0, img.height % 256, img.height // 256]))
    
    # Print the image row by row
    for y in range(img.height):
        row_data = bytearray()
        for x in range(0, img.width, 8):
            byte = 0
            for bit in range(8):
                if x + bit < img.width and img.getpixel((x + bit, y)) == 0:
                    byte |= 1 << (7 - bit)
            row_data.append(byte)
        ser.write(row_data)
    
    ser.write(b'\n')  # Move to the next line after image

"""

[TO dO List]

1.) ,.How to make the clientside app save and show the actualy state of the tables.
2.) ,.Only show the Start button if the day has not started. ***
3.) ,.end of day function.
4.) BILLING
    Test  more item adding to bills. resets and what not what happens when table is off
    totalling
    .) live billing lable
    .) reciept.
    .) Proccess payment button
5.) times up close ssystem
5.) Reports
6.) make sure all tables are set to off when starting 
7.) Add admin page
8.) For billing Active tables should either be catagorized alone or not displayed
    -force customer name

9.) Name for bills
10.) admin panel needs to have  the custom timeframes fixed on the reports page.    
"""