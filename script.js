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

/* ================================
CREATE HOURS
================================ */

for (let hour = 0; hour <= 23; hour++) {

```
const option =
    document.createElement("option");

const value =
    String(hour).padStart(2, "0");

option.value = value;

option.textContent = value;

hourSelect.appendChild(option);
```

}

/* ================================
CREATE MINUTES
================================ */

for (let minute = 0; minute < 60; minute += 5) {

```
const option =
    document.createElement("option");

const value =
    String(minute).padStart(2, "0");

option.value = value;

option.textContent = value;

minuteSelect.appendChild(option);
```

}

/* ================================
PREVENT PAST DATES
================================ */

const today =
new Date().toISOString().split("T")[0];

dateInput.min = today;

/* ================================
FORM SUBMISSION
================================ */

form.addEventListener("submit", function(event) {

```
event.preventDefault();


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


if (
    !booking.from ||
    !booking.to ||
    !booking.date ||
    !booking.hour ||
    !booking.minute ||
    !booking.name ||
    !booking.phone
) {

    showStatus(
        "Fyll i alla uppgifter.",
        "error"
    );

    return;
}


submitButton.disabled = true;

submitButton.textContent =
    "Skickar bokning...";


/*
   TEMPORARY FRONTEND TEST

   Supabase + Telegram will be
   connected in the next step.
*/

setTimeout(function() {

    console.log(
        "Booking:",
        booking
    );


    showStatus(
        "Bokningsförfrågan är klar att skickas.",
        "success"
    );


    submitButton.disabled = false;

    submitButton.textContent =
        "Boka resa";

}, 700);
```

});

/* ================================
STATUS MESSAGE
================================ */

function showStatus(message, type) {

```
statusBox.textContent = message;

statusBox.className =
    "status " + type;

statusBox.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
});
```

}
