const form = document.getElementById("bookingForm");
const submitButton = document.getElementById("submitButton");
const statusBox = document.getElementById("status");

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    // Prevent double submissions
    submitButton.disabled = true;
    submitButton.textContent = "Skickar bokning...";

    statusBox.className = "status";
    statusBox.textContent = "";

    // Collect booking information
    const booking = {
        from: document.getElementById("from").value.trim(),
        to: document.getElementById("to").value.trim(),
        date: document.getElementById("date").value,
        hour: document.getElementById("hour").value,
        minute: document.getElementById("minute").value,
        name: document.getElementById("name").value.trim(),
        phone: document.getElementById("phone").value.trim()
    };

    // Basic validation
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

    // Validate hour
    const hour = Number(booking.hour);

    if (hour < 0 || hour > 23) {
        showError("Ange en giltig timme mellan 00 och 23.");
        return;
    }

    // Validate minute
    const minute = Number(booking.minute);

    if (minute < 0 || minute > 59) {
        showError("Ange giltiga minuter mellan 00 och 59.");
        return;
    }

    try {
        /*
         * Send booking to Cloudflare Worker
         */

        const response = await fetch("/api/book", {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                from: booking.from,
                to: booking.to,
                date: booking.date,
                hour: String(hour).padStart(2, "0"),
                minute: String(minute).padStart(2, "0"),
                name: booking.name,
                phone: booking.phone
            })
        });

        const result = await response.json();

        /*
         * Backend rejected the booking
         */

        if (!response.ok || !result.success) {
            throw new Error(
                result.error || "Bokningen kunde inte skickas."
            );
        }

        /*
         * Booking successfully saved
         */

        statusBox.className = "status success";

        statusBox.innerHTML = `
            <strong>✅ Bokningen är mottagen!</strong><br><br>
            Tack för din bokning.<br>
            Vi återkommer så snart som möjligt.
        `;

        // Clear form
        form.reset();

        // Restore button
        submitButton.disabled = false;
        submitButton.textContent = "Skicka bokning";

        /*
         * Optional taxi animation
         */

        triggerTaxiAnimation();

    } catch (error) {

        console.error("Booking error:", error);

        showError(
            "Något gick fel med bokningen.<br><br>" +
            "Ring oss istället på <strong>072-447 44 35</strong>."
        );
    }
});


/*
 * Show error message
 */

function showError(message) {

    statusBox.className = "status error";

    statusBox.innerHTML = message;

    submitButton.disabled = false;
    submitButton.textContent = "Skicka bokning";
}


/*
 * Small taxi animation
 *
 * This will only run if the animation
 * element exists in the HTML.
 */

function triggerTaxiAnimation() {

    const taxi = document.querySelector(".taxi-animation");

    if (!taxi) {
        return;
    }

    taxi.classList.remove("drive");

    // Force browser to restart animation
    void taxi.offsetWidth;

    taxi.classList.add("drive");
}