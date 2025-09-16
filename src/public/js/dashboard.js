
// Wallet functions
async function updateWalletBalance() {
    try {
        const response = await fetch('/api/wallet/balance');
        const data = await response.json();
        document.getElementById('walletBalance').textContent = `${data.balance} tokens`;
    } catch (error) {
        console.error('Error updating wallet balance:', error);
    }
}


document.getElementById('addTokensForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    try {
        const response = await fetch('/api/wallet/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: Number(formData.get('amount')) })
        });
        await response.json();
        updateWalletBalance();
        bootstrap.Modal.getInstance(document.getElementById('addTokensModal')).hide();
    } catch (error) {
        console.error('Error adding tokens:', error);
    }
});

document.getElementById('betForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;

    try {
        const formData = new FormData(e.target);
        const type = formData.get('type');
        let numberValue = formData.get('number');

        if (type === "jodii") {
            numberValue = numberValue.padStart(2, "0"); // keep leading zero
        } else {
            numberValue = Number(numberValue);
        }

        const betData = {
            name: formData.get('name'),
            phoneNumber: formData.get('phoneNumber'),
            number: numberValue,
            amount: Number(formData.get('amount')),
            date: formData.get('date'),
            period: formData.get('period'),
            type
        };

        const response = await fetch('/api/bets/place', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(betData)
        });

        const data = await response.json();

        if (response.ok) {
            alert(`Bet placed successfully!\nTransaction ID: ${data.transactionId}`);
            document.getElementById('walletBalance').textContent = `${data.newBalance} tokens`;
            e.target.reset();
            loadBetHistory();
        } else {
            alert(data.message || 'Error placing bet');
        }
    } catch (error) {
        console.error('Error placing bet:', error);
        alert('Error placing bet. Please try again.');
    } finally {
        submitButton.disabled = false;
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const betDateInput = document.getElementById("betDate");
    const periodField = document.getElementById("periodField");
    const betType = document.getElementById("betType");
    const numberField = document.getElementById("numberField");

    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 3);

    // Set min/max for date picker
    betDateInput.min = today.toISOString().split("T")[0];
    betDateInput.max = maxDate.toISOString().split("T")[0];

    // Default bet date (today or tomorrow)
    const now = new Date();
    const isMorningOpen = now.getHours() < 11;
    const isAfternoonOpen = now.getHours() < 15;
    const isEveningOpen = now.getHours() < 22 || (now.getHours() === 22 && now.getMinutes() < 30);

    if (isMorningOpen || isAfternoonOpen || isEveningOpen) {
        betDateInput.value = today.toISOString().split("T")[0];
    } else {
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);
        betDateInput.value = tomorrow.toISOString().split("T")[0];
    }

    // Function to render periods dynamically
    function renderPeriods() {
        const selectedDate = new Date(betDateInput.value);
        const isToday = selectedDate.toDateString() === today.toDateString();

        let options = `
            <option value="">Select Period</option>
            <option value="morning">Morning (till 11 AM)</option>
            <option value="afternoon">Afternoon (till 3 PM)</option>
            <option value="evening">Evening (till 10:30 PM)</option>
        `;

        periodField.innerHTML = `
            <select class="form-control" name="period" id="periodSelect" required>
                ${options}
            </select>
        `;

        const periodSelect = document.getElementById("periodSelect");

        if (isToday) {
            if (now.getHours() >= 11) {
                periodSelect.querySelector("option[value='morning']").disabled = true;
            }
            if (now.getHours() >= 15) {
                periodSelect.querySelector("option[value='afternoon']").disabled = true;
            }
            if (now.getHours() >= 22 && now.getMinutes() >= 30) {
                periodSelect.querySelector("option[value='evening']").disabled = true;
            }
        }
    }

    // Function to render number input based on type
    function renderNumberField() {
        if (betType.value === "jodii") {
            numberField.innerHTML = `
                <input type="text" class="form-control"
                       placeholder="Number (00-99)"
                       name="number"
                       pattern="^[0-9]{2}$"
                       required>
            `;
        } else {
            numberField.innerHTML = `
                <input type="number" class="form-control"
                       placeholder="Number (0-9)"
                       name="number"
                       min="0" max="9"
                       required>
            `;
        }
    }

    betDateInput.addEventListener("change", renderPeriods);
    betType.addEventListener("change", renderNumberField);

    renderPeriods();
    renderNumberField();
});

async function loadBetHistory() {
    try {
        const response = await fetch('/api/bets/history');
        const bets = await response.json();
        const tbody = document.getElementById('betHistory');
        tbody.innerHTML = bets.map(bet => `
            <tr>
                <td>${bet.transactionId}</td>
                <td>${new Date(bet.date).toLocaleDateString()}</td>
                <td>${bet.name}</td>
                <td>${bet.number}</td>
                <td>${bet.amount}</td>
                <td>${bet.type}</td>
                <td>${bet.period}</td>
                <td>
                    <span class="badge bg-${bet.status === 'won' ? 'success' : bet.status === 'lost' ? 'danger' : 'warning'}">
                        ${bet.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading bet history:', error);
    }
}

// Initial load
updateWalletBalance();
loadBetHistory();

