const form = document.getElementById("bookingForm");
const submitButton = document.getElementById("submitButton");
const statusBox = document.getElementById("status");

const hourSelect = document.getElementById("hour");
const minuteSelect = document.getElementById("minute");

// =========================
// CREATE TIME OPTIONS
// =========================

if (hourSelect) {
    hourSelect.innerHTML = '<option value="">Välj</option>';

    for (let hour = 0; hour <= 23; hour++) {
        const option = document.createElement("option");

        option.value = String(hour).padStart(2, "0");
        option.textContent = String(hour).padStart(2, "0");

        hourSelect.appendChild(option);
    }
}

if (minuteSelect) {
    minuteSelect.innerHTML = '<option value="">Välj</option>';

    for (let minute = 0; minute < 60; minute += 5) {
        const option = document.createElement("option");

        option.value = String(minute).padStart(2, "0");
        option.textContent = String(minute).padStart(2, "0");

        minuteSelect.appendChild(option);
    }
}


// =========================
// BOOKING FORM
// =========================

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    submitButton.disabled = true;
    submitButton.textContent = "Skickar bokning...";

    statusBox.className = "status";
    statusBox.textContent = "";

    const booking = {
        from: document.getElementById("from").value.trim(),
        to: document.getElementById("to").value.trim(),
        date: document.getElementById("date").value,
        hour: document.getElementById("hour").value,
        minute: document.getElementById("minute").value,
        name: document.getElementById("name").value.trim(),
        phone: document.getElementById("phone").value.trim()
    };

    // =========================
    // VALIDATION
    // =========================

    if (
        !booking.from ||
        !booking.to ||
        !booking.date ||
        !booking.hour ||
        !booking.minute ||
        !booking.name ||
        !booking.phone
    ) {
        showError("Fyll i alla uppgifter innan du skickar bokningen.");
        return;
    }

    const hour = Number(booking.hour);
    const minute = Number(booking.minute);

    if (hour < 0 || hour > 23) {
        showError("Ange en giltig timme mellan 00 och 23.");
        return;
    }

    if (minute < 0 || minute > 59) {
        showError("Ange giltiga minuter mellan 00 och 59.");
        return;
    }

    try {

        // =========================
        // SEND TO CLOUDFLARE WORKER
        // =========================

        const response = await fetch("/api/book", {
            method: "POST",

            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },

            body: JSON.stringify({
                from_location: booking.from,
                to_location: booking.to,
                booking_date: booking.date,
                booking_hour: hour,
                booking_minute: minute,
                customer_name: booking.name,
                customer_phone: booking.phone
            })
        });

        const result = await response.json();

        if (!response.ok || !result.ok) {
            throw new Error(
                result.error || "Bokningen kunde inte skickas."
            );
        }

        // =========================
        // SUCCESS
        // =========================

        statusBox.className = "status success";

        statusBox.innerHTML = `
            <strong>✅ Bokningen är mottagen!</strong><br><br>
            Tack för din bokning.<br>
            Vi återkommer så snart som möjligt.
        `;

        form.reset();

        submitButton.disabled = false;
        submitButton.textContent = "Skicka bokning";

        triggerTaxiAnimation();

    } catch (error) {

        console.error("Booking error:", error);

        showError(
            "Något gick fel med bokningen.<br><br>" +
            'Ring oss istället på <strong>072-447 44 35</strong>.'
        );
    }
});


// =========================
// ERROR MESSAGE
// =========================

function showError(message) {

    statusBox.className = "status error";

    statusBox.innerHTML = message;

    submitButton.disabled = false;
    submitButton.textContent = "Skicka bokning";
}


// =========================
// TAXI ANIMATION
// =========================

function triggerTaxiAnimation() {

    const taxi = document.querySelector(".taxi-car");

    if (!taxi) {
        return;
    }

    taxi.classList.remove("drive");

    void taxi.offsetWidth;

    taxi.classList.add("drive");
}