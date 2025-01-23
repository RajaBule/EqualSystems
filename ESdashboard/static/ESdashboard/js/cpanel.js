function pauseAllIntervals() {
    for (const id of activeIntervals) {
        clearInterval(id);
    }
    timerinterval = null;
    updateinterval = null;
    console.log('All intervals paused');
}


function startInterval() {
    timerinterval = setInterval(timerCheck, 60000);
    updateinterval = setInterval(updateButtonData, 5000);
    console.log("Interval started!");
}

function handleButtonClick(button) {
    const tableId = button.id;
    const relayId = button.getAttribute('data-relay-id');
    const state = button.getAttribute('data-state');
    const url = button.getAttribute('data-url');
    const tableName = button.getAttribute('name');
    const starturl = button.getAttribute('data-start-table-url');
    const setTime = button.getAttribute('data-settime');
    const customerName = button.getAttribute('data-customer-name') || 'New Customer'; // Default if no customer name provided
    const rate_id = button.getAttribute('data-selected-rate-id');
    const ratePmin = button.getAttribute('data-selected-ratepMin');
    const billTotal = button.getAttribute('data-bill-total');
    const billId = button.getAttribute('data-bill-id');
    const startTime = new Date(button.getAttribute('data-start-time'));
    console.log('ButtonHanle set rate to: ', rate_id, ratePmin, 'timestart: ', startTime)
    if (state == 1) {
        // Code for handling the Stop modal
        const stopModal = new bootstrap.Modal(document.getElementById('modal-2'));
        const addButton = document.getElementById('addTime')
        
        const stopButton = document.querySelector('#modal-2 .stop-table-btn');
        stopButton.setAttribute('data-table-id', tableId);
        stopButton.setAttribute('data-relay-id', relayId);
        stopButton.setAttribute('data-url', url);
        stopButton.setAttribute('data-table-name', tableName);
        stopButton.setAttribute('data-selected-rate-id', rate_id);
        stopButton.setAttribute('data-bill-id', billId);
        
        addButton.setAttribute('data-table-id', tableId);
        addButton.setAttribute('data-start-time', startTime);
        addButton.setAttribute('data-relay-id', relayId);
        addButton.setAttribute('data-url', url);
        addButton.setAttribute('data-table-name', tableName);
        addButton.setAttribute('data-selected-rate-id', rate_id);
        addButton.setAttribute('data-bill-id', billId);
        addButton.setAttribute('data-settime', setTime);
        document.getElementById("modal-2-label").innerText = `Stop ${tableName}`;
        
        const now = new Date();
        const elapsedMinutes = Math.floor((now - startTime) / (1000 * 60));  // Convert to minutes
        const tableBillingCostReal = (elapsedMinutes * ratePmin);
        const tableBillingCost = (tableBillingCostReal + 1000).toFixed(0)  // Calculate cost
        
        // AJAX request to get the bill items for the selected table
        fetch(`/get-bill-items/${tableId}/`)
            .then(response => response.json())
            .then(data => {
                const billTableBody = document.querySelector('#bill tbody');
                billTableBody.innerHTML = '';  // Clear existing table rows

                // Add each item from the fetched data
                data.items.forEach(item => {
                    const row = `<tr>
                        <td class="text-light">${item.product_name}</td>
                        <td class="text-light">${item.quantity}</td>
                        <td class="text-light">${item.total}</td>
                    </tr>`;
                    billTableBody.insertAdjacentHTML('beforeend', row);
                });

                // Add table duration and cost row
                const durationRow = `<tr>
                    <td class="text-light">Table Time</td>
                    <td class="text-light">${elapsedMinutes} min</td>
                    <td class="text-light">${tableBillingCost}</td>
                </tr>`;
                billTableBody.insertAdjacentHTML('beforeend', durationRow);

                // Add the total row
                const totalRow = `<tr>
                    <td class="fw-bold text-success" style="border-top: 1px solid var(--bs-secondary);">TOTAL</td>
                    <td class="text-success" style="border-top: 1px solid var(--bs-secondary);"></td>
                    <td class="fw-bold text-success" style="border-top: 1px solid var(--bs-secondary);">${(parseFloat(data.total) + parseFloat(tableBillingCost)).toFixed(0)}</td>
                </tr>`;
                billTableBody.insertAdjacentHTML('beforeend', totalRow);
            })
            .catch(error => console.error('Error fetching bill items:', error));

        stopModal.show();
    } else if(state == 0) {
        // Set the table number and customer name in the modal title
        document.getElementById('modal-table-number').textContent = tableId;
        document.getElementById('modal-customer-name').textContent = customerName;

        const openModal = new bootstrap.Modal(document.getElementById('modal-3'));
        const openButton = document.querySelector('#modal-3 .open-table-btn');
        openButton.setAttribute('data-table-id', tableId);
        openButton.setAttribute('data-relay-id', relayId);
        openButton.setAttribute('data-url', url);
        openButton.setAttribute('data-table-name', tableName);
        openButton.setAttribute('data-start-table-url', starturl);
        openButton.setAttribute('data-settime', setTime);
        openButton.setAttribute('data-selected-rate-id', rate_id);
        openButton.setAttribute('data-selected-rate-value', ratePmin);
        openButton.setAttribute('data-bill-total', billTotal);

        openModal.show();
    }
}


document.getElementById('modal-3').addEventListener('hidden.bs.modal', function () {
    // Clear all the input fields inside the modal
    document.getElementById('customer-name').value = '';
    document.getElementById('selected-rate-id').value = '';
    document.getElementById('timeh').value = '';
    document.getElementById('timem').value = '';
});

//START TABLE MOAL
function handleTableStateChange3(button) {
    const tableId = button.getAttribute('data-table-id');
    const relayId = button.getAttribute('data-relay-id');
    const url = button.getAttribute('data-url');
    const starturl = button.getAttribute('data-start-table-url');
    const state = 1;
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const customerName = document.getElementById('customer-name').value;
    const ratePmin = button.getAttribute('data-selected-rate-value');
    const billTotal = button.getAttribute('data-bill-total');
    console.log(customerName)
    // Get the selected rate ID
    const selectedRateId = document.getElementById('selected-rate-id').value;
    const startTime = new Date().toISOString();
    console.log('Moal select rate: ', selectedRateId, ratePmin)
    // Get user input for duration (hours and minutes)
    const hours = parseInt(document.getElementById('timeh').value) || 0;
    const minutes = parseInt(document.getElementById('timem').value) || 0;

    const totalTimeMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);

    const data = {
        'table_id': tableId,
        'relay_id': relayId,
        'state': state,
        'rate_id': selectedRateId,
        'start_time': startTime,
        'set_time': totalTimeMs,
        'customer_name': customerName,
    };

    console.log('Logging Open data', data)

    // Send the AJAX request to update the table's state and rate
    $.ajax({
        type: "POST",
        url: url,
        data: data,
        headers: {
            'X-CSRFToken': csrftoken
        },
        success: function(response) {
            console.log('successful POST');
            const tableElement = document.getElementById(tableId);
            const updatedState = response.updated_state;
            
            tableElement.setAttribute('data-state', updatedState);
            tableElement.setAttribute('data-selected-rate-id', selectedRateId);
            tableElement.setAttribute('data-selected-ratePmin', ratePmin);
            const tablediv = document.getElementById(`div-${tableId}`)
            if (updatedState === 1) {
                console.log('Table set to in-use state');
                // Update the table's appearance
                tablediv.style = "height: 100%;width: 19.5%;margin-left: 5px;border: 5.4px solid var(--bs-form-valid-border-color);"
                // Check if the user set a timer
                if (hours > 0 || minutes > 0) {
                    console.log(`Starting countdown: ${hours} hours, ${minutes} minutes`);
                    // Start the countdown based on user input
                    //startCountdown(tableId, totalTimeMs, startTime, "Start");
                } else {
                    console.log('No timer set, skipping countdown');
                }

                // Call the start_table Django view to handle business day and billing
                $.ajax({
                    type: "POST",
                    url: starturl.replace('table_id', tableId),
                    data: {
                        'table_id': tableId,
                        'rate_id': selectedRateId,  // Send the selected rate to the start_table view as well
                        'customer_name': customerName,
                    },
                    headers: {
                        'X-CSRFToken': csrftoken
                    },
                    success: function(response) {
                        console.log('Table started successfully with new bill');
                    },
                    error: function(xhr, status, error) {
                        console.error("Error while starting table:", error, status, xhr);
                    }
                });
            }

            // Close the modal
            document.getElementById('hidden-close-button').click();

            // Optionally, show a success message
            alert('Table has been opened successfully!');
            updateTableDuration(tableId, startTime, state, ratePmin, billTotal);
            console.log("RatePMin after success: ", ratePmin)
        },
        error: function(xhr, status, error) {
            console.error("Error while opening the table:", error, status, xhr);
        }
    });
    //location.reload();
}



function handleTableStateChange2(button) {
    console.log("Button clicked:", button); // This should log the button element

    // Get data from the button
    const tableId = button.getAttribute('data-table-id');
    const relayId = button.getAttribute('data-relay-id');
    const url = button.getAttribute('data-url');
    const tableName = button.getAttribute('data-table-name');
    const selectedRateId = button.getAttribute('data-selected-rate-id');
    const labelElement = document.getElementById(`timeleft-${tableId}`);
    const billId = button.getAttribute('data-bill-id');
    const billingLabel = document.getElementById(`live-billing-${tableId}`);
    const tablediv = document.getElementById(`div-${tableId}`);

    console.log(tableName);
    document.getElementById("modal-2-label").innerText = tableName;

    // Prepare the data to send via AJAX
    const data = {
        'table_id': tableId,
        'relay_id': relayId,
        'state': 0, // Stopping the table, state = 0
        'rate_id': selectedRateId,
        'csrfmiddlewaretoken': '{{ csrf_token }}', // Ensure CSRF token is included for Django
    };

    console.log(data);

    // Wrap the AJAX request in a Promise
    const updateTableState = new Promise((resolve, reject) => {
        $.ajax({
            type: "POST",
            url: url, // The URL to the Django view that handles the state update
            data: data,
            beforeSend: function() {
                pauseAllIntervals();
            },
            success: function(response) {
                console.log('successful POST');

                // Update the state in the HTML (front-end) upon successful response
                const tableElement = document.getElementById(tableId);
                const updatedState = response.updated_state;

                tableElement.setAttribute('data-state', updatedState);
                tablediv.style =
                    "height: 100%;width: 19.5%;border: 5.4px solid var(--bs-secondary-text-emphasis);margin-left: 5px;";
                billingLabel.innerHTML = "Billing: 0";

                if (updatedState === 0) {
                    console.log('Table set to 0 state');
                } else if (updatedState === 1) {
                    console.log('Table set to 1 state');
                }

                document.getElementById(`${tableId}-time`).innerText = '-';
                document.getElementById(`timeleft-${tableId}`).innerText = '-';
                document.getElementById('hidden-close-button-stop').click();
                labelElement.innerHTML = '-';

                clearInterval(intervalIds[tableId]);
                clearInterval(countdownIntervalid[tableId]);

                // Show success message
                alert('Table has been stopped successfully!');

                resolve(); // Resolve the promise when done
            },
            error: function(xhr, status, error) {
                console.error("Error stopping the table:", error);
                alert('Failed to stop the table. Please try again.');
                reject(error); // Reject the promise on error
            },
        });
    });

    // Use async/await to wait for the AJAX call to complete
    (async () => {
        try {
            await updateTableState; // Wait for the AJAX request to complete
            console.log("Table state updated. Proceeding to print receipt...");

            // Send the fetch request to print the receipt
            const response = await fetch(`/print_receipt/${billId}/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken'), // Ensure CSRF token is sent with the request
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            if (data.success) {
                startInterval();
                alert('Receipt printed successfully!');
            } else {
                alert('Failed to print the receipt.');
            }
        } catch (error) {
            console.error("An error occurred:", error);
        }
    })();
    
}


function addTime(button) {
        const tableId = button.getAttribute('data-table-id')
        const relayId = button.getAttribute('data-relay-id');
        const state = button.getAttribute('data-state');
        const url = button.getAttribute('data-url');
        const tableName = button.getAttribute('name');
        const starturl = button.getAttribute('data-start-table-url');
        const setTime = button.getAttribute('data-settime');
        const customerName = button.getAttribute('data-customer-name') || 'New Customer'; // Default if no customer name provided
        const rate_id = button.getAttribute('data-selected-rate-id');
        const ratePmin = button.getAttribute('data-selected-ratepMin');
        const billTotal = button.getAttribute('data-bill-total');
        const billId = button.getAttribute('data-bill-id');
        const startTime = new Date(button.getAttribute('data-start-time'));

    // Set the table number and customer name in the modal title
        document.getElementById('modal-table-number').textContent = tableId;
        document.getElementById('modal-customer-name').textContent = customerName;

        const openModal = new bootstrap.Modal(document.getElementById('modal-addTime'));
        const openButton = document.querySelector('#modal-addTime .open-table-btn');
        openButton.setAttribute('data-table-id', tableId);
        openButton.setAttribute('data-relay-id', relayId);
        openButton.setAttribute('data-url', url);
        openButton.setAttribute('data-table-name', tableName);
        openButton.setAttribute('data-start-table-url', starturl);
        openButton.setAttribute('data-settime', setTime);
        openButton.setAttribute('data-selected-rate-id', rate_id);
        openButton.setAttribute('data-selected-rate-value', ratePmin);
        openButton.setAttribute('data-bill-total', billTotal);
        openButton.setAttribute('data-start-time', startTime);

        openModal.show();
}

function setTimeAfter(button) {
    console.log('CALL SET TIME!!!!!')
    const tableId = button.getAttribute('data-table-id');
    const relayId = button.getAttribute('data-relay-id');
    const state = button.getAttribute('data-state');
    const url = button.getAttribute('data-url');
    const tableName = button.getAttribute('name');
    const starturl = button.getAttribute('data-start-table-url');
    const setTime = button.getAttribute('data-settime');
    const customerName = button.getAttribute('data-customer-name') || 'New Customer'; // Default if no customer name provided
    const rate_id = button.getAttribute('data-selected-rate-id');
    const ratePmin = button.getAttribute('data-selected-ratepMin');
    const billTotal = button.getAttribute('data-bill-total');
    const billId = button.getAttribute('data-bill-id');
    const startTime = new Date(button.getAttribute('data-start-time'));
    let setTimeCheck = false
    // Get the current time
    const currentTime = new Date();
    
    // Calculate elapsed time in milliseconds
    const elapsedTimeMs = currentTime - startTime;
    if (setTime !== '-' && setTime !== 'None') {
        setTimeCheck = true
    }

    const hours = parseInt(document.getElementById('timeha').value) || 0;
    const minutes = parseInt(document.getElementById('timema').value) || 0;

    const totalTimeMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);
    console.log('Table, StarTime, Hours, Minutes, TimeMS: ',tableId, startTime, hours, minutes, totalTimeMs)
    saveTimerState(tableId, totalTimeMs);
    
}

document.getElementById('startall').addEventListener('click', function() {
    
    const url = this.getAttribute('data-url');
    const starturl = this.getAttribute('data-start-day-url')
    // Send request to Django view to set all relays to off
    fetch(url, {  // Update with the correct URL
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': '{{ csrf_token }}'  // Include CSRF token
        },
        body: JSON.stringify({})
    })
    
    .then(response => {
        if (response.ok) {
            fetch(starturl, { method: 'POST', headers: { 'X-CSRFToken': getCookie('csrftoken') } })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message);
                    // Optionally, update UI or refresh data
                    document.getElementById('main1').style.display = 'block';
                    this.style.setProperty('display', 'none', 'important');
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error:', error));
            // Show the main1 div
            
            // this.id = 'endday';
            // Move the button and change its properties
            
            //this.classList.remove('btn-success');
            //this.classList.add('btn.btn-primary.btn-sm.text-center.d-block.icon-button.w-100');
            // Optionally, append to the div after main1
            //const main1Div = document.getElementById('main1');
            //main1Div.parentNode.insertBefore(this, main1Div.nextSibling);
        }
    })
    .catch(error => console.error('Error:', error));


});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Check if this cookie string begins with the desired name
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.addEventListener("DOMContentLoaded", function() {
    // Check if the day has already started
    let startbutton = document.getElementById('startall')
    let dayStarted = document.getElementById('start_check')
    const started = dayStarted.getAttribute('data-day-started')
    let mainDiv = document.getElementById('main1');
    console.log(started)
    if (started == 'True') {
        mainDiv.style.display = 'block';
        startbutton.style.setProperty('display', 'none', 'important');
    } else if (started == 'False') {
        mainDiv.style.display = 'none';
    } else {
        console.log('Error Checking day start')
    }
    
});

function enddaybutton(button) {
    // Get the URL for ending the day from the button attribute
    const endDayUrl = button.getAttribute('data-end-day-url');

    // Send the POST request to the Django view
    fetch(endDayUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken') // Include CSRF token
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // On success, update the state of all buttons
            document.getElementById('main1').style.display = 'none';
            document.getElementById('startall').style.display = 'block';
            const tableButtons = document.querySelectorAll('.btn-primary');
            tableButtons.forEach(tableButton => {
                tableButton.setAttribute('data-state', '0');
            });
            // Clear all table intervals
            for (let tableId in intervalIds) {
                if (intervalIds.hasOwnProperty(tableId)) {
                    const labelElement = document.getElementById(`${tableId}-time`);
                    clearInterval(intervalIds[tableId]);
                    delete intervalIds[tableId]; // Remove the interval from the object
                    labelElement.innerHTML = '-';
                }
            }
            let dayStarted = document.getElementById('start_check')
            dayStarted.setAttribute('data-day-started', 'False');
            alert("Business day ended and tables updated successfully.");
        } else {
            console.error('Error:', data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function selectRate(rateId, rateName) {
    document.getElementById('selected-rate-id').value = rateId;
    console.log(`Selected Rate: ${rateName} (ID: ${rateId})`);
}

// Store interval IDs so they can be cleared later
const intervalIds = {};

function updateTableDuration(tableId, startTime, tableState, ratePerMinute, billTotal) {
    const durationLabel = document.getElementById(`${tableId}-time`);
    const billingLabel = document.getElementById(`live-billing-${tableId}`);
    
    console.log('Starting timer for table: ', tableId);
    console.log('Start time:', startTime);
    console.log('Rate Per minute on Table uration: ', ratePerMinute)
    console.log('Bill Total in upateuration: ', billTotal)
    // Clear any existing interval for this table
    if (intervalIds[tableId]) {
        clearInterval(intervalIds[tableId]);
    }

    // If the table state is 0, reset the timer and billing label, then return
    if (tableState === 0) {
        durationLabel.innerHTML = "-";
        billingLabel.innerHTML = "Billing: 0";
        return;
    }

    // Convert startTime to a Date object
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
        durationLabel.innerHTML = "-";
        billingLabel.innerHTML = "Billing: 0";
        return;
    }

    // Create a new interval to update the time and billing every second
    intervalIds[tableId] = setInterval(() => {
        const now = new Date();
        const elapsedTimeMs = new Date(now - startDate);

        const seconds = Math.floor((elapsedTimeMs % (1000 * 60)) / 1000);
        const minutes = Math.floor((elapsedTimeMs % (1000 * 60 * 60)) / (1000 * 60));
        const hours = Math.floor(elapsedTimeMs / (1000 * 60 * 60));

        // Update the duration label
        durationLabel.innerHTML = `${hours}h ${minutes}m ${seconds}s`;

        // Calculate current billing based on elapsed time and rate per minute
        const elapsedMinutes = Math.floor(elapsedTimeMs / 60000);
        const currentBilling = (elapsedMinutes * ratePerMinute).toFixed(2);
        const finalBilling = Number(currentBilling) + Number(billTotal) + 1000;

        //console.log("Elapse time: ",elapsedMinutes, " \n ratePerMinute: ",ratePerMinute)
        // Update the billing label
        billingLabel.innerHTML = `Billing: ${finalBilling}`;

        // Optionally, check if table state changes during the interval
        // If table state becomes 0, stop and reset the timer and billing label
        if (tableState === 0) {
            clearInterval(intervalIds[tableId]);
            durationLabel.innerHTML = "-";
            billingLabel.innerHTML = "Billing: 0";
        }
    }, 1000);
}


// Countdown intervals mapped by tableId
const countdownIntervalid = {};
const countdownTimeRemaining = {}; // Store remaining time for each table
function startCountdown(tableId, setTime, startTime) {
    console.log("TABLE, SETTIME, STARTTIME: ", tableId, setTime, startTime);

    const labelElement = document.getElementById(`timeleft-${tableId}`);
    const button = document.getElementById(tableId);

    const endTime = new Date(setTime); // Target end time
    const start = new Date(startTime); // Start time
    const currentTime = new Date();

    // Calculate remaining time in milliseconds
    let remainingTime = endTime - currentTime;

    // Handle invalid inputs
    if (isNaN(endTime.getTime()) || isNaN(start.getTime())) {
        labelElement.innerHTML = "-";
        return;
    }

    if (remainingTime <= 0) {
        labelElement.innerHTML = "Time's up!";
        timeupStop(button);
        return;
    }

    countdownIntervalid[tableId] = setInterval(() => {
        if (remainingTime <= 0) {
            clearInterval(countdownIntervalid[tableId]);
            labelElement.innerHTML = "Time's up!";
            timeupStop(button);
            return;
        }

        remainingTime -= 1000; // Decrement remaining time by 1 second

        const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
        const seconds = Math.floor((remainingTime / 1000) % 60);

        // Update label with formatted time
        labelElement.innerHTML = `${hours}h ${minutes}m ${seconds}s`;

    }, 1000);
}


function saveTimerState(tableId, setTime) {
    console.log(`Saving timer state for table ${tableId}:  ${setTime}`);
    if (countdownIntervalid[tableId]){
        console.log("Old timer found, clearing now!");
        clearInterval(countdownIntervalid[tableId]);
        delete countdownIntervalid[tableId]; // Remove the reference
       }
    fetch(`/update_timer/${tableId}/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({
            table_id: tableId,
            additional_time: setTime,
        })
    }).then(response => response.json())
      .then(data => {
          console.log("Timer state saved:", data);
          //updateButtonData();
          
      });
}

// Set time times up function
function timeupStop(button) {
    // Get data from the button
    console.log('STOP CALL FOR: ')
    console.log(button)
    const tableId = button.getAttribute('id');
    const relayId = button.getAttribute('data-relay-id');
    const url = button.getAttribute('data-url');
    const tableName = button.getAttribute('name');
    const labelElement = document.getElementById(`timeleft-${tableId}`);
    console.log(tableName)
    console.log(labelElement)
    console.log(tableId, relayId)
    document.getElementById(`${tableId}-time`).innerText = '-';
    // Update the end_time and reset other relevant data as needed
    document.getElementById(`timeleft-${tableId}`).innerText = '-';
    // Close the modal
    //document.getElementById('hidden-close-button-stop').click();
    labelElement.innerHTML = '-'
    clearInterval(intervalIds[tableId]);
    clearInterval(countdownIntervalid[tableId]);
    timerCheck();
    //updateButtonData()
    
    // Optionally, show a success message
    alert(`'Table ${tableId} has been stopped. (Time is up!)`);
        
}


function handlepButtonClick(button) {
    // Get table number from the button's ID (or name or data attribute)
    const tableNumber = button.id.split('-')[1];

    // Open the modal
    const modal = new bootstrap.Modal(document.getElementById('modal-1'), {});
    modal.show();

    // Set table ID in the purchase button's data attributes
    const purchaseButton = document.querySelector('#modal-1 button[name="purchase"]');
    purchaseButton.setAttribute('data-table-id', tableNumber);

    // Optionally, reset or update any other fields in the modal (like quantity)
    document.querySelector('#modal-1 input[type="number"]').value = '';
}

// Handle the purchase logic when clicking "Tambah"
function handlePurchase(purchaseButton) {
    const tableId = purchaseButton.getAttribute('data-table-id');
    const selectedItem = purchaseButton.getAttribute('data-item');
    const quantity = document.querySelector('#modal-1 input[type="number"]').value;
    console.log('Table id: ', tableId)

    // Send the request to the server (you may need to update this to fit your app)
    const url = purchaseButton.getAttribute('data-url');
    
    // Example of sending data via fetch
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': '{{ csrf_token }}'  // Include CSRF token for security
        },
        body: JSON.stringify({
            table_id: tableId,
            item: selectedItem,
            quantity: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Success:', data);
        location.reload();
        // Close the modal after successful submission
        const modal = bootstrap.Modal.getInstance(document.getElementById('modal-1'));
        modal.hide();
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

document.querySelectorAll('#modal-1 .dropdown-item').forEach(item => {
    item.addEventListener('click', function() {
        const selectedItem = this.textContent.trim();
        const purchaseButton = document.querySelector('#modal-1 button[name="purchase"]');
        purchaseButton.setAttribute('data-item', selectedItem);
    });
});

function updateButtonData() {
    // Fetch updated table data from the server
    fetch('/api/get_table_data/')  // Adjust the URL to match your endpoint
        .then(response => response.json())
        .then(data => {
            const tables = data.tables;

            // Iterate through the tables and update button attributes
            tables.forEach(table => {
                const button = document.getElementById(table.table_number);
                const div = document.getElementById(`div-${table.table_number}`);
                const bill_label = document.getElementById(`live-billing-${table.table_number}`);

                
                if (button) {
                    button.setAttribute('data-relay-id', table.relay_id);
                    button.setAttribute('data-state', table.state);
                    button.setAttribute('data-start-time', table.start_time || '');
                    button.setAttribute('data-bill-total', table.total_billing);
                    button.setAttribute('data-selected-rate-id', table.rate_id);
                    button.setAttribute('data-selected-ratepMin', table.rate_per_minute || '');
                    button.setAttribute('data-settime', table.set_time || null);
                    //button.setAttribute('data-start-table-url', table.start_table_url);
                    button.setAttribute('data-bill-id', table.bill_id);
                    button.setAttribute('data-unique-id', table.unique_id);

                    // Optionally update the button's style based on the state
                    //if (table.state === 1) {
                    //    button.style.backgroundColor = 'var(--bs-form-valid-color)';
                    //    button.style.borderColor = 'var(--bs-form-valid-border-color)';
                    if (table.state === 0) {
                        bill_label.textContent = 'Billing: 0'
                        button.style.backgroundColor = 'var(--bs-secondary)';
                        button.style.borderColor = 'var(--bs-secondary)';
                        div.style.border = '5.4px solid var(--bs-secondary-text-emphasis)';
                    }

                    if (table.state === 1 && table.set_time != null) {
                        console.log('UPCALL!!!!: ', table.set_time)
                        const setTime = table.set_time;
                        const startTime = table.start_time;
                        const duration = table.duration;
                        if (setTime || startTime) {
                            clearInterval(countdownIntervalid[table.table_number]);
                            delete countdownIntervalid[table.table_number]; // Remove the reference
                            //const totalTimeMs = setTime ? new Date(setTime) - new Date(startTime) : duration * 60 * 1000; // Fallback to duration if set_time is not set
                            startCountdown(table.table_number, setTime, startTime);
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error('Error fetching table data:', error);
        });
}

const activeIntervals = [];
// Call the function periodically (e.g., every 5 seconds)
let updateinterval = setInterval(updateButtonData, 5000);
activeIntervals.push(updateinterval);
function timerCheck() {
    console.log("TimerCheck Call...")
    // Fetch updated table data from the server
    fetch('/api/get_count_downs/')  // Adjust the URL to match your endpoint
        .then(response => response.json())
        .then(data => {
            // Check if the response contains the 'updated_state' key
            if (data.updated_state !== undefined) {
                console.log("Response has updated_state:", data.updated_state);
                // Add logic for when updated_state is present
                // For example:
                updateButtonData()
            } else {
                console.log("Response does not have updated_state.");
            }
        })
        .catch(error => {
            console.error('Error fetching count_down data:', error);
        });
}

let timerinterval = setInterval(timerCheck, 60000);
activeIntervals.push(timerinterval);

