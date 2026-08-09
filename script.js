```javascript
// ========================================
// TAXI WEBSITE
// Frontend functionality
// ========================================


// ================================
// ELEMENTS
// ================================

const form = document.getElementById("bookingForm");

const submitButton =
    document.getElementById("submitButton");

const statusBox =
    document.getElementById("status");

const hourSelect =
    document.getElementById("hour");

const minuteSelect =
    document.getElementById("minute");

const dateInput =
    document.getElementById("date");


// ================================
// CREATE HOURS
// ================================

for (let hour = 0; hour <= 23; hour++) {

    const option =
        document.createElement("option");

    option.value =
        String(hour).padStart(2, "0");

    option.textContent =
        String(hour).padStart(2, "0");

    hourSelect.appendChild(option);
}


// ================================
// CREATE MINUTES
// ================================

for (let minute = 0; minute <= 59; minute++) {

    const option =
        document.createElement("option");

    option.value =
        String(minute).padStart(2, "0");

    option.textContent =
        String(minute).padStart(2, "0");

    minuteSelect.appendChild(option);
}


// ================================
// PREVENT PAST DATES
// ================================

const today =
    new Date().toISOString().split("T")[0];

dateInput.min = today;


// ================================
// FORM SUBMISSION
// ================================

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        // --------------------------------
        // Collect information
        // --------------------------------

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
                dateInput.value,

            hour:
                hourSelect.value,

            minute:
                minuteSelect.value,

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


        // --------------------------------
        // Loading state
        // --------------------------------

        submitButton.disabled = true;

        submitButton.textContent =
            "Skickar bokning...";

        statusBox.className =
            "status";

        statusBox.textContent =
            "";


        try {

            /*
             * SUPABASE WILL BE CONNECTED HERE
             *
             * For now we are only testing
             * the website interface.
             */


            await new Promise(
                resolve =>
                    setTimeout(resolve, 800)
            );


            // --------------------------------
            // Temporary success message
            // --------------------------------

            statusBox.className =
                "status success";

            statusBox.textContent =
                "Tack! Din bokning är mottagen.";


            form.reset();


            // Restore today's minimum date
            dateInput.min = today;


        } catch (error) {

            console.error(error);


            statusBox.className =
                "status error";

            statusBox.textContent =
                "Något gick fel. Ring oss istället på 072-447 44 35.";
        }


        submitButton.disabled = false;

        submitButton.textContent =
            "Skicka bokning";
    }
);
```
