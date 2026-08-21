const form = document.getElementById("bookingForm");
const submitButton = document.getElementById("submitButton");
const statusBox = document.getElementById("status");
const callPanel = document.getElementById("callPanel");

const hourSelect = document.getElementById("hour");
const minuteSelect = document.getElementById("minute");


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


// Create minute options: 00, 05, 10 ... 55

if (minuteSelect) {

    minuteSelect.innerHTML =
        '<option value="">Välj</option>';

    for (let minute = 0; minute < 60; minute += 5) {

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


            // ==================================================
            // PREVENT DOUBLE SUBMISSION
            // ==================================================

            submitButton.disabled = true;

            submitButton.classList.add("is-loading");

            submitButton.textContent =
                "Skickar bokning...";


            // Clear previous status

            statusBox.className =
                "form-message";

            statusBox.innerHTML = "";


            // Hide phone panel when starting a new attempt

            hideCallPanel();


            // ==================================================
            // COLLECT FORM DATA
            // ==================================================

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


            // ==================================================
            // VALIDATION
            // ==================================================

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


            // ==================================================
            // VALIDATE HOUR
            // ==================================================

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


            // ==================================================
            // VALIDATE MINUTE
            // ==================================================

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


            // ==================================================
            // SEND BOOKING TO CLOUDFLARE
            // ==================================================

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

                            /*
                             * IMPORTANT:
                             *
                             * These names match book.js:
                             *
                             * from
                             * to
                             * date
                             * hour
                             * minute
                             * name
                             * phone
                             */

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


                // ==================================================
                // READ RESPONSE
                // ==================================================

                let result;

                try {

                    result =
                        await response.json();

                } catch (jsonError) {

                    throw new Error(
                        "Servern skickade ett ogiltigt svar."
                    );
                }


                // ==================================================
                // CHECK RESPONSE
                // ==================================================

                /*
                 * book.js returns:
                 *
                 * {
                 *     success: true,
                 *     telegramSent: true
                 * }
                 *
                 * Therefore we check result.success.
                 */

                if (
                    !response.ok ||
                    result.success !== true
                ) {

                    throw new Error(
                        result.error ||
                        "Bokningen kunde inte skickas."
                    );
                }


                // ==================================================
                // SUCCESS
                // ==================================================

                statusBox.className =
                    "form-message success";

                statusBox.innerHTML = `
                    <strong>✅ Bokningen är mottagen!</strong><br><br>
                    Tack för din bokning.<br>
                    Vi återkommer så snart som möjligt.
                `;


                // Clear form

                form.reset();


                // Restore button

                submitButton.disabled =
                    false;

                submitButton.classList.remove(
                    "is-loading"
                );

                submitButton.innerHTML = `
                    <span class="button-text">
                        Boka resa
                    </span>

                    <span class="button-loader"></span>
                `;


                // Make absolutely sure
                // phone panel stays hidden on success

                hideCallPanel();


                // Taxi animation

                triggerTaxiAnimation();

            }


            // ==================================================
            // ERROR
            // ==================================================

            catch (error) {

                console.error(
                    "Booking error:",
                    error
                );


                showError(
                    "Bokningen kunde inte skickas.<br><br>" +

                    "Tekniskt fel: " +

                    "<strong>" +

                    escapeHtml(
                        error.message
                    ) +

                    "</strong><br><br>" +

                    "Ring oss istället på " +

                    "<strong>072-447 44 35</strong>."
                );
            }

        }
    );
}


// ============================================================
// SHOW ERROR
// ============================================================

function showError(message) {

    statusBox.className =
        "form-message error";

    statusBox.innerHTML =
        message;


    submitButton.disabled =
        false;

    submitButton.classList.remove(
        "is-loading"
    );

    submitButton.innerHTML = `
        <span class="button-text">
            Boka resa
        </span>

        <span class="button-loader"></span>
    `;


    // ========================================================
    // SHOW PHONE PANEL ONLY AFTER ERROR
    // ========================================================

    showCallPanel();


    // Scroll phone panel into view
    // gently on smaller screens

    setTimeout(() => {

        if (
            window.innerWidth < 560 &&
            callPanel
        ) {

            callPanel.scrollIntoView({
                behavior: "smooth",
                block: "nearest"
            });
        }

    }, 100);
}


// ============================================================
// SHOW CALL PANEL
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
// HIDE CALL PANEL
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
        document.querySelector(
            ".taxi-car"
        );

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

    if (
        backgroundImages.length <= 1
    ) {
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
// START BACKGROUND SLIDESHOW
// ============================================================

if (
    backgroundImages.length > 1
) {

    setInterval(
        changeBackground,
        8000
    );
}