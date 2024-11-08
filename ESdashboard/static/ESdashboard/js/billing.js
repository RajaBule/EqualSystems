document.addEventListener("DOMContentLoaded", function() {
    // Process Payment Button click event
    document.querySelectorAll(".process-payment-btn").forEach(function(button) {
        button.addEventListener("click", function() {
            const billId = this.getAttribute("data-bill-id");

            // Fetch the billing data (replace with actual AJAX request if needed)
            fetch(`/get-bill-data/${billId}/`)
                .then(response => response.json())
                .then(data => {
                    const billItems = data.items;
                    const totalAmount = data.total_amount;

                    // Populate the modal table with billing items
                    const billingItemsTable = document.getElementById("billing-items");
                    billingItemsTable.innerHTML = '';  // Clear any existing rows
                    console.log(billItems)
                    billItems.forEach(item => {
                        const row = `<tr>
                            <td class="text-light">${item.product_name}</td>
                            <td class="text-light">${item.quantity}</td>
                            <td class="text-light">${item.line_total}</td>
                        </tr>`;
                        billingItemsTable.insertAdjacentHTML('beforeend', row);
                    });

                    // Update the total
                    document.getElementById("total-billing").innerText = totalAmount;

                    // Set the bill ID in the pay button for later use
                    document.getElementById("payButton").setAttribute("data-bill-id", billId);
                });
        });
    });

    // Handle the payment process when "BAYAR" is clicked
    document.getElementById("payButton").addEventListener("click", function() {
        const billId = this.getAttribute("data-bill-id");

        // Mark the bill as paid (replace with actual AJAX request to your server)
        fetch(`/pay-bill/${billId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')  // Ensure CSRF token is sent with the request
            },
            body: JSON.stringify({ is_paid: true })
        }).then(response => {
            if (response.ok) {
                alert("Payment successful!");
                location.reload();  // Refresh the page to update the list of unpaid/paid bills
            } else {
                alert("Payment failed. Please try again.");
            }
        });
    });
});

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

document.querySelector('.modal-footer .btn[data-bs-dismiss="modal"]').addEventListener('click', function() {
    const billId = document.getElementById("payButton").dataset.billId;

    fetch(`/print_receipt/${billId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),  // Ensure CSRF token is sent with the request
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Receipt printed successfully!');
        } else {
            alert('Failed to print the receipt.');
        }
    })
    .catch(error => console.error('Error:', error));
});