function handleButtonClick(button) {
    const tableId = button.id;
    const relayId = button.getAttribute('data-relay-id');
    const state = button.getAttribute('data-state');
    const url = button.getAttribute('data-url');
    const tableName = button.getAttribute('name');
    const starturl = button.getAttribute('data-start-table-url');
    const setTime = button.getAttribute('data-settime');

    if (state == 1) {
        const stopModal = new bootstrap.Modal(document.getElementById('modal-2'));
        const stopButton = document.querySelector('#modal-2 .stop-table-btn');
        stopButton.setAttribute('data-table-id', tableId);
        stopButton.setAttribute('data-relay-id', relayId);
        stopButton.setAttribute('data-url', url);
        stopButton.setAttribute('data-table-name', tableName);

        // AJAX request to get the bill items for the selected table
        fetch(`/get-bill-items/${tableId}/`)
            .then(response => response.json())
            .then(data => {
                const billTableBody = document.querySelector('#bill tbody');
                billTableBody.innerHTML = '';  // Clear existing table rows

                data.items.forEach(item => {
                    const row = `<tr>
                        <td class="text-light">${item.product_name}</td>
                        <td class="text-light">${item.quantity}</td>
                        <td class="text-light">${item.total}</td>
                    </tr>`;
                    billTableBody.insertAdjacentHTML('beforeend', row);
                });

                // Add the total row
                const totalRow = `<tr>
                    <td class="fw-bold text-success" style="border-top: 1px solid var(--bs-secondary);">TOTAL</td>
                    <td class="text-success" style="border-top: 1px solid var(--bs-secondary);"></td>
                    <td class="fw-bold text-success" style="border-top: 1px solid var(--bs-secondary);">${data.total}</td>
                </tr>`;
                billTableBody.insertAdjacentHTML('beforeend', totalRow);
            })
            .catch(error => console.error('Error fetching bill items:', error));

        stopModal.show();
    } else {
        const openModal = new bootstrap.Modal(document.getElementById('modal-3'));
        const openButton = document.querySelector('#modal-3 .open-table-btn');
        openButton.setAttribute('data-table-id', tableId);
        openButton.setAttribute('data-relay-id', relayId);
        openButton.setAttribute('data-url', url);
        openButton.setAttribute('data-table-name', tableName);
        openButton.setAttribute('data-start-table-url', starturl);
        openButton.setAttribute('data-settime', setTime);

        openModal.show();
    }
}

function handleTableStateChange3(button) {
    const tableId = button.getAttribute('data-table-id');
    const relayId = button.getAttribute('data-relay-id');
    const url = button.getAttribute('data-url');
    const starturl = button.getAttribute('data-start-table-url');
    const state = 1;
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Get the selected rate ID
    const selectedRateId = document.getElementById('selected-rate-id').value;
    const startTime = new Date().toISOString();

    // Get user input for duration (hours and minutes)
    const hours = parseInt(document.getElementById('timeh').value) || 0;
    const minutes = parseInt(document.getElementById('timem').value) || 0;

    const totalTimeMs = (hours * 60 * 60 * 1000) + (minutes * 60 * 1000);

    // Send the AJAX request to update the table's state and rate
    $.ajax({
        type: "POST",
        url: url,
        data: {
            'table_id': tableId,
            'relay_id': relayId,
            'state': state,
            'rate_id': selectedRateId,
            'start_time': startTime,
            'set_time': totalTimeMs,
        },
        headers: {
            'X-CSRFToken': csrftoken
        },
        success: function(response) {
            console.log('successful POST');
            const tableElement = document.getElementById(tableId);
            const updatedState = response.updated_state;

            tableElement.setAttribute('data-state', updatedState);

            if (updatedState === 1) {
                console.log('Table set to in-use state');

                // Check if the user set a timer
                if (hours > 0 || minutes > 0) {
                    console.log(`Starting countdown: ${hours} hours, ${minutes} minutes`);
                    // Start the countdown based on user input
                    startCountdown(tableId, totalTimeMs, startTime);
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
            updateTableDuration(tableId, startTime);
        },
        error: function(xhr, status, error) {
            console.error("Error while opening the table:", error, status, xhr);
        }
    });
}



function handleTableStateChange2(button) {
    console.log("Button clicked:", button); // This should log the button element
    // Get data from the button
    const tableId = button.getAttribute('data-table-id');
    const relayId = button.getAttribute('data-relay-id');
    const url = button.getAttribute('data-url');
    const tableName = button.getAttribute('data-table-name');
    const labelElement = document.getElementById(`timeleft-${tableId}`);
    console.log(labelElement)
    console.log(tableId, relayId)
    // Prepare the data to send via AJAX
    const data = {
        'table_id': tableId,
        'relay_id': relayId,
        'state': 0, // Stopping the table, state = 0
        'csrfmiddlewaretoken': '{{ csrf_token }}' // Ensure CSRF token is included for Django
    };

    // Send an AJAX POST request to update the state in the database
    $.ajax({
        type: "POST",
        url: url, // The URL to the Django view that handles the state update
        data: data,
        success: function(response) {
            console.log('successful POST')
            // Update the state in the HTML (front-end) upon successful response
            const tableElement = document.getElementById(tableId);

            // Use the updated state from the response
            const updatedState = response.updated_state;

            // Update the state attribute in the document
            tableElement.setAttribute('data-state', updatedState); 
            
            // Change button content based on the updated state (0 = Open, 1 = In Use)
            if (updatedState === 0) {
                console.log('Table set to 0 state')
            } else if (updatedState === 1) {
                console.log('Table set to 1 state')
            }

            document.getElementById(`${tableId}-time`).innerText = '-';
            // Update the end_time and reset other relevant data as needed
            document.getElementById(`timeleft-${tableId}`).innerText = '-';
            // Close the modal
            document.getElementById('hidden-close-button-stop').click();
            labelElement.innerHTML = '-'
            clearInterval(intervalIds[tableId]);
            clearInterval(countdownIntervalid[tableId]);

            // Optionally, show a success message
            alert('Table has been stopped successfully!');
        },
        error: function(xhr, status, error) {
            // Handle errors if the request fails
            console.log("Error stopping the table:", error);
            alert('Failed to stop the table. Please try again.');
        }
    });
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

function updateTableDuration(tableId, startTime, tableState) {
    const labelElement = document.getElementById(`${tableId}-time`);
    console.log('starting timer for table: ' , tableId)
    console.log(startTime)
    // Clear any existing interval for this table
    if (intervalIds[tableId]) {
        clearInterval(intervalIds[tableId]);
    }

    // If the table state is 0, reset the timer and return
    if (tableState === 0) {
        labelElement.innerHTML = "-";
        return;
    }

    // Convert startTime to a Date object
    const startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
        labelElement.innerHTML = "-";
        return;
    }
    console.log(startDate)

    // Create a new interval to update the time every second
    intervalIds[tableId] = setInterval(() => {
        const now = new Date();
        const elapsedTime = new Date(now - startDate);

        const seconds = Math.floor((elapsedTime % (1000 * 60)) / 1000);
        const minutes = Math.floor((elapsedTime % (1000 * 60 * 60)) / (1000 * 60));
        const hours = Math.floor(elapsedTime / (1000 * 60 * 60));

        // Update the label
        labelElement.innerHTML = `${hours}h ${minutes}m ${seconds}s`;

        // Optionally, check if table state changes during the interval
        // If table state becomes 0, stop and reset the timer
        if (tableState === 0) {
            clearInterval(intervalIds[tableId]);
            labelElement.innerHTML = "-";
        }
    }, 1000);
}


const countdownIntervalid = {};
// Countdown timer function
function startCountdown(tableId, totalTimeMs, startTime) {
    const labelElement = document.getElementById(`timeleft-${tableId}`);
    
    // Parse startTime to a Date object
    const start = new Date(startTime);
    const currentTime = new Date();
    console.log('recieved time set: ', totalTimeMs)
    console.log(startTime)
    
    if (isNaN(start.getTime()) || isNaN(totalTimeMs)) {
        labelElement.innerHTML = "-";
        return;
    }

    if (totalTimeMs == '' || startTime == '') {
        labelElement.innerHTML = '-';
        return; // Skip the countdown
    }

    // Calculate the elapsed time in milliseconds
    const elapsedTimeMs = currentTime - start;



    let remainingTime = totalTimeMs - elapsedTimeMs;
    console.log('Remaining TIme: ', remainingTime)

    if (remainingTime <= 0) {
        labelElement.innerHTML = "-";
        clearInterval(countdownIntervalid[tableId]);
        labelElement.innerHTML = "Time's up!";
        const button = document.getElementById(tableId);
        timeupStop(button)
        return;
    }
    
    countdownIntervalid[tableId] = setInterval(() => {
        if (remainingTime <= 0) {
            clearInterval(countdownIntervalid[tableId]);
            labelElement.innerHTML = "Time's up!";
            const button = document.getElementById(tableId);
            console.log(button)
            if (button) {
                timeupStop(button);

            }
            return;
        }

        remainingTime -= 1000;

        const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
        const seconds = Math.floor((remainingTime / 1000) % 60);

        labelElement.innerHTML = `${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

//Set time times up function
function timeupStop(button) {
    // Get data from the button
    handleButtonClick(button);
    //const tableId = button.id;
    //const relayId = button.getAttribute('data-relay-id');
    //const url = button.getAttribute('data-url');
    //const tableName = button.getAttribute('name');
    //
    //console.log(tableId, relayId)
    //// Prepare the data to send via AJAX
    //const data = {
    //    'table_id': tableId,
    //    'relay_id': relayId,
    //    'state': 0, // Stopping the table, state = 0
    //    'csrfmiddlewaretoken': '{{ csrf_token }}' // Ensure CSRF token is included for Django
    //};
//
    //// Send an AJAX POST request to update the state in the database
    //$.ajax({
    //    type: "POST",
    //    url: url, // The URL to the Django view that handles the state update
    //    data: data,
    //    success: function(response) {
    //        console.log('successful POST')
    //        // Update the state in the HTML (front-end) upon successful response
    //        const tableElement = document.getElementById(tableId);
//
    //        // Use the updated state from the response
    //        const updatedState = response.updated_state;
//
    //        // Update the state attribute in the document
    //        tableElement.setAttribute('data-state', updatedState); 
    //        
    //        // Change button content based on the updated state (0 = Open, 1 = In Use)
    //        if (updatedState === 0) {
    //            console.log('Table set to 0 state')
    //        } else if (updatedState === 1) {
    //            console.log('Table set to 1 state')
    //        }
//
    //        document.getElementById(`${tableId}-time`).innerText = '-';
    //        // Update the end_time and reset other relevant data as needed
    //        document.getElementById(`timeleft-${tableId}`).innerText = '-';
    //        // Close the modal
    //        document.getElementById('hidden-close-button-stop').click();
    //        clearInterval(intervalIds[tableId]);
    //        clearInterval(countdownIntervalid[tableId]);
    //        // Optionally, show a success message
    //        alert('Table has been stopped successfully!');
    //    },
    //    error: function(xhr, status, error) {
    //        // Handle errors if the request fails
    //        console.log("Error stopping the table:", error);
    //        alert('Failed to stop the table. Please try again.');
    //    }
    //});
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
