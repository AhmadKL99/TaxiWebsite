const form = document.getElementById("bookingForm");
const submitButton = document.getElementById("submitButton");
const statusBox = document.getElementById("status");

const hourSelect = document.getElementById("hour");
const minuteSelect = document.getElementById("minute");

const callPanel = document.getElementById("callPanel");


// ============================================================
// TIME OPTIONS
// ============================================================

// Create hour options: 00–23

if (hourSelect) {

    hourSelect.innerHTML =
        '<option value="">Välj</option>';

    for (let hour = 0; hour <= 23; hour++) {

        const option =
            document.createElement("option");

        option.value =
            String(hour).padStart(2, "0");

        option.textContent =
            String(hour).padStart(2, "0");

        hourSelect.appendChild(option);
    }
}


// Create minute options:
// 00, 05, 10 ... 55

if (minuteSelect) {

    minuteSelect.innerHTML =
        '<option value="">Välj</option>';

    for (
        let minute = 0;
        minute < 60;
        minute += 5
    ) {

        const option =
            document.createElement("option");

        option.value =
            String(minute).padStart(2, "0");

        option.textContent =
            String(minute).padStart(2, "0");

        minuteSelect.appendChild(option);
    }
}


// ============================================================
// BOOKING FORM
// ============================================================

if (form) {

    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // ----------------------------------------------------
            // Hide old error
            // ----------------------------------------------------

            hideCallPanel();

            statusBox.className = "form-message";
            statusBox.innerHTML = "";


            // ----------------------------------------------------
            // Prevent duplicate bookings
            // ----------------------------------------------------

            submitButton.disabled = true;
            submitButton.classList.add("is-loading");

            submitButton.textContent =
                "Skickar bokning...";


            // ----------------------------------------------------
            // Collect form data
            // ----------------------------------------------------

            const booking = {

                from:
                    document
                        .getElementById("from")
                        .value
                        .trim(),

                to:
                    document
                        .getElementById("to")
                        .value
                        .trim(),

                date:
                    document
                        .getElementById("date")
                        .value,

                hour:
                    document
                        .getElementById("hour")
                        .value,

                minute:
                    document
                        .getElementById("minute")
                        .value,

                name:
                    document
                        .getElementById("name")
                        .value
                        .trim(),

                phone:
                    document
                        .getElementById("phone")
                        .value
                        .trim()
            };


            // ====================================================
            // VALIDATION
            // ====================================================

            if (
                !booking.from ||
                !booking.to ||
                !booking.date ||
                !booking.hour ||
                !booking.minute ||
                !booking.name ||
                !booking.phone
            ) {

                showError(
                    "Fyll i alla uppgifter innan du skickar bokningen."
                );

                return;
            }


            // ----------------------------------------------------
            // Validate hour
            // ----------------------------------------------------

            const hour =
                Number(booking.hour);

            if (
                !Number.isInteger(hour) ||
                hour < 0 ||
                hour > 23
            ) {

                showError(
                    "Ange en giltig timme mellan 00 och 23."
                );

                return;
            }


            // ----------------------------------------------------
            // Validate minute
            // ----------------------------------------------------

            const minute =
                Number(booking.minute);

            if (
                !Number.isInteger(minute) ||
                minute < 0 ||
                minute > 59
            ) {

                showError(
                    "Ange giltiga minuter mellan 00 och 59."
                );

                return;
            }


            // ====================================================
            // SEND BOOKING TO CLOUDFLARE
            // ====================================================

            try {

                const response =
                    await fetch(
                        "/api/book",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Accept":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    from:
                                        booking.from,

                                    to:
                                        booking.to,

                                    date:
                                        booking.date,

                                    hour:
                                        String(hour)
                                            .padStart(2, "0"),

                                    minute:
                                        String(minute)
                                            .padStart(2, "0"),

                                    name:
                                        booking.name,

                                    phone:
                                        booking.phone
                                })
                        }
                    );


                // =================================================
                // READ SERVER RESPONSE
                // =================================================

                let result = null;

                const responseText =
                    await response.text();


                if (responseText) {

                    try {

                        result =
                            JSON.parse(responseText);

                    } catch (jsonError) {

                        console.error(
                            "Invalid JSON from server:",
                            responseText
                        );

                        throw new Error(
                            "Servern skickade ett ogiltigt svar."
                        );
                    }
                }


                // =================================================
                // DEBUG SERVER RESPONSE
                // =================================================

                console.log(
                    "Booking HTTP status:",
                    response.status
                );

                console.log(
                    "Booking server response:",
                    result
                );


                // =================================================
                // SUCCESS CHECK
                // =================================================

                /*
                 * Your current book.js returns:
                 *
                 * {
                 *     success: true,
                 *     telegramSent: true
                 * }
                 *
                 * We also accept "ok: true" so this frontend
                 * remains compatible if the Worker wrapper returns
                 * that format.
                 */

                const bookingSucceeded =
                    response.ok &&
                    result &&
                    (
                        result.success === true ||
                        result.telegramSent === true ||
                        result.ok === true
                    );


                if (!bookingSucceeded) {

                    throw new Error(
                        result?.error ||
                        "Bokningen kunde inte skickas."
                    );
                }


                // =================================================
                // SUCCESS
                // =================================================

                hideCallPanel();


                statusBox.className =
                    "form-message success";


                statusBox.innerHTML = `
                    <strong>✅ Bokningen är mottagen!</strong>
                    <br><br>
                    Tack för din bokning.
                    <br>
                    Vi återkommer så snart som möjligt.
                `;


                // ------------------------------------------------
                // Clear form
                // ------------------------------------------------

                form.reset();


                // ------------------------------------------------
                // Restore button
                // ------------------------------------------------

                submitButton.disabled = false;

                submitButton.classList.remove(
                    "is-loading"
                );

                submitButton.textContent =
                    "Boka resa";


                // ------------------------------------------------
                // Taxi animation
                // ------------------------------------------------

                triggerTaxiAnimation();

            }


            // ====================================================
            // ERROR
            // ====================================================

            catch (error) {

                console.error(
                    "Booking error:",
                    error
                );


                showError(
                    "Bokningen kunde inte skickas." +
                    "<br><br>" +
                    "Tekniskt fel: " +
                    "<strong>" +
                    escapeHtml(error.message) +
                    "</strong>" +
                    "<br><br>" +
                    "Ring oss istället på " +
                    "<strong>072-447 44 35</strong>."
                );
            }

        }
    );
}


// ============================================================
// ERROR MESSAGE
// ============================================================

function showError(message) {

    statusBox.className =
        "form-message error";

    statusBox.innerHTML =
        message;


    // Show phone panel ONLY when there is an error

    showCallPanel();


    // Restore button

    submitButton.disabled = false;

    submitButton.classList.remove(
        "is-loading"
    );

    submitButton.textContent =
        "Boka resa";
}


// ============================================================
// SHOW PHONE PANEL
// ============================================================

function showCallPanel() {

    if (!callPanel) {
        return;
    }

    callPanel.classList.add(
        "is-visible"
    );

    callPanel.setAttribute(
        "aria-hidden",
        "false"
    );
}


// ============================================================
// HIDE PHONE PANEL
// ============================================================

function hideCallPanel() {

    if (!callPanel) {
        return;
    }

    callPanel.classList.remove(
        "is-visible"
    );

    callPanel.setAttribute(
        "aria-hidden",
        "true"
    );
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(text) {

    const div =
        document.createElement("div");

    div.textContent =
        String(text);

    return div.innerHTML;
}


// ============================================================
// TAXI ANIMATION
// ============================================================

function triggerTaxiAnimation() {

    const taxi =
        document.querySelector(".taxi-car");

    if (!taxi) {
        return;
    }


    taxi.classList.remove(
        "drive"
    );


    // Force browser to restart animation

    void taxi.offsetWidth;


    taxi.classList.add(
        "drive"
    );
}


// ============================================================
// BACKGROUND IMAGE SLIDESHOW
// ============================================================

const backgroundImages =
    document.querySelectorAll(
        ".background-image"
    );


let currentBackground = 0;


function changeBackground() {

    if (backgroundImages.length <= 1) {
        return;
    }


    backgroundImages[
        currentBackground
    ].classList.remove(
        "active"
    );


    currentBackground =
        (
            currentBackground + 1
        ) %
        backgroundImages.length;


    backgroundImages[
        currentBackground
    ].classList.add(
        "active"
    );
}


// ============================================================
// START SLIDESHOW
// ============================================================

if (backgroundImages.length > 1) {

    setInterval(
        changeBackground,
        8000
    );
}