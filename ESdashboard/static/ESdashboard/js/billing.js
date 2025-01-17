document.addEventListener("DOMContentLoaded", function () {
    // Process Payment Button click event
    document.querySelectorAll(".process-payment-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const billId = this.getAttribute("data-bill-id");

            fetch(`/get-bill-data/${billId}/`)
                .then((response) => response.json())
                .then((data) => {
                    const billItems = data.items;
                    const totalAmount = data.total_amount;

                    // Populate the modal table with billing items
                    const billingItemsTable = document.getElementById("billing-items");
                    billingItemsTable.innerHTML = ""; // Clear existing rows
                    billItems.forEach((item) => {
                        const row = `<tr>
                            <td class="text-light">${item.product_name}</td>
                            <td class="text-light">${item.quantity}</td>
                            <td class="text-light">${item.line_total}</td>
                        </tr>`;
                        billingItemsTable.insertAdjacentHTML("beforeend", row);
                    });

                    // Update the total and add a discount input
                    document.getElementById("total-billing").innerText = totalAmount;
                    document.getElementById("discountInput").value = ""; // Reset discount input

                    document.getElementById("payButton").setAttribute("data-total-amount", totalAmount);
                    document.getElementById("payButton").setAttribute("data-bill-id", billId);
                });
        });
    });

    // Update total dynamically when discount is entered
    document.getElementById("discountInput").addEventListener("input", function () {
        const totalAmount = parseFloat(document.getElementById("payButton").getAttribute("data-total-amount")) || 0;
        const discountPercent = parseFloat(this.value) || 0;
        const discountedTotal = totalAmount * (1 - discountPercent / 100);
        document.getElementById("total-billing").innerText = discountedTotal.toFixed(2);
    });

    // Handle payment process
    document.getElementById("payButton").addEventListener("click", function () {
        const totalAmount = parseFloat(this.getAttribute("data-total-amount")) || 0;
        const cashReceived = parseFloat(document.getElementById("MoneyRecieved").value) || 0;
        const discountPercent = parseFloat(document.getElementById("discountInput").value) || 0;
        const billId = this.getAttribute("data-bill-id");

        if (cashReceived < totalAmount * (1 - discountPercent / 100)) {
            alert("Insufficient cash received.");
            return;
        }

        const change = cashReceived - totalAmount * (1 - discountPercent / 100);

        fetch(`/pay-bill/${billId}/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": getCookie("csrftoken"),
            },
            body: JSON.stringify({ discount: discountPercent, is_paid: true }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.status === "success") {
                    alert(`Payment successful! Change: ${change.toFixed(2)}`);
                    location.reload();
                } else {
                    alert("Payment failed. Please try again.");
                }
            })
            .catch((error) => console.error("Error:", error));
    });

    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== "") {
            const cookies = document.cookie.split(";");
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === name + "=") {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});

document.getElementById("discountInput").addEventListener("input", function () {
    let discountPercent = parseFloat(this.value) || 0;
    if (discountPercent < 0) discountPercent = 0;
    if (discountPercent > 100) discountPercent = 100;
    this.value = discountPercent;
    const totalAmount = parseFloat(document.getElementById("payButton").getAttribute("data-total-amount")) || 0;
    const discountedTotal = totalAmount * (1 - discountPercent / 100);
    document.getElementById("total-billing").innerText = discountedTotal.toFixed(2);
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === name + "=") {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function printAll() {
    fetch('/print-all-receipts/', {
        method: 'POST',
        headers: {
            "X-CSRFToken": getCookie("csrftoken"),  // Ensure CSRF token is included
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Display the content in a modal
            const modalContent = document.getElementById('modalContent');
            modalContent.innerHTML = data.content;  // Set the returned content

            const modal = new bootstrap.Modal(document.getElementById('receiptModal'));
            modal.show();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
