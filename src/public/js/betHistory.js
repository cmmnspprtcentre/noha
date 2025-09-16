let selectedBet = null;

// Render bet rows
function renderBetHistory(bets) {
  const tbody = document.getElementById("betHistory");
  tbody.innerHTML = "";

  bets.forEach((bet, index) => {
    const row = `
      <tr>
        <td>${bet.transactionId}</td>
        <td>${bet.date}</td>
        <td>${bet.name}</td>
        <td>${bet.number}</td>
        <td>₹${bet.amount}</td>
        <td>${bet.type}</td>
        <td>${bet.period}</td>
        <td>${bet.status}</td>
        <td>
          <button class="btn btn-sm btn-primary viewBet" data-index="${index}">
            <i class="bi bi-eye"></i>
          </button>
        </td>
      </tr>
    `;
    tbody.insertAdjacentHTML("beforeend", row);
  });

  document.querySelectorAll(".viewBet").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.closest("button").getAttribute("data-index");
      selectedBet = bets[idx];
      showBetDetails(selectedBet);
    });
  });
}

// Show bet details in modal
function showBetDetails(bet) {
  const detailsHtml = `
    <p><strong>Transaction ID:</strong> ${bet.transactionId}</p>
    <p><strong>Date:</strong> ${bet.date}</p>
    <p><strong>Name:</strong> ${bet.name}</p>
    <p><strong>Number:</strong> ${bet.number}</p>
    <p><strong>Amount:</strong> ₹${bet.amount}</p>
    <p><strong>Type:</strong> ${bet.type}</p>
    <p><strong>Period:</strong> ${bet.period}</p>
    <p><strong>Status:</strong> ${bet.status}</p>
  `;
  document.getElementById("betDetailsContent").innerHTML = detailsHtml;
  new bootstrap.Modal(document.getElementById("betDetailsModal")).show();
}

// Send to WhatsApp
document.getElementById("sendToWhatsapp").addEventListener("click", () => {
  if (!selectedBet) return;

  const text = `
Bet Details:
----------------
Transaction ID: ${selectedBet.transactionId}
Date: ${selectedBet.date}
Name: ${selectedBet.name}
Number: ${selectedBet.number}
Amount: ₹${selectedBet.amount}
Type: ${selectedBet.type}
Period: ${selectedBet.period}
Status: ${selectedBet.status}
  `;

  const encoded = encodeURIComponent(text);
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
  window.open(url, "_blank");
});
