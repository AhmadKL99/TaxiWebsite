const PHONE_DISPLAY = "072-447 44 35";
const MAX_FIELD_LENGTH = 120;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request, env),
      });
    }

    /*
     * API endpoint
     *
     * Your script.js sends bookings to:
     * POST /api/book
     */
    if (url.pathname === "/api/book") {
      return handleBooking(request, env);
    }

    /*
     * For normal website requests, return the website.
     *
     * This requires index.html to be available as a Worker asset.
     */
    if (request.method === "GET") {
      return env.ASSETS.fetch(request);
    }

    return jsonResponse(
      {
        ok: false,
        error: "not_found",
      },
      404,
      corsHeaders(request, env)
    );
  },
};


/* =========================================================
   BOOKING API
========================================================= */

async function handleBooking(request, env) {
  const cors = corsHeaders(request, env);

  if (!isOriginAllowed(request, env)) {
    return jsonResponse(
      {
        ok: false,
        error: "origin_not_allowed",
      },
      403,
      cors
    );
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        error: "method_not_allowed",
      },
      405,
      cors
    );
  }

  try {
    ensureEnvironment(env);

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return jsonResponse(
        {
          ok: false,
          error: "invalid_content_type",
        },
        415,
        cors
      );
    }

    const raw = await request.json().catch(() => null);

    /*
     * IMPORTANT:
     *
     * This matches the data currently sent by your script.js:
     *
     * from
     * to
     * date
     * hour
     * minute
     * name
     * phone
     */
    const booking = normalizeBooking(raw);

    const validationError = validateBooking(booking);

    if (validationError) {
      return jsonResponse(
        {
          ok: false,
          error: validationError,
        },
        400,
        cors
      );
    }

    /*
     * 1. SAVE BOOKING TO SUPABASE
     */

    const savedBooking = await saveToSupabase(env, booking);

    /*
     * 2. SEND TELEGRAM NOTIFICATION
     */

    const telegramResult = await sendTelegramNotification(
      env,
      booking
    );

    /*
     * The booking was saved even if Telegram fails.
     */

    if (!telegramResult.ok) {
      await markBookingStatus(
        env,
        savedBooking.id,
        "notification_failed"
      );

      return jsonResponse(
        {
          ok: false,
          error: "notification_failed",
          phone: PHONE_DISPLAY,
        },
        502,
        cors
      );
    }

    /*
     * 3. EVERYTHING SUCCEEDED
     */

    return jsonResponse(
      {
        ok: true,
        id: savedBooking.id || null,
      },
      200,
      cors
    );

  } catch (error) {
    console.error(
      "Booking worker error",
      safeError(error)
    );

    return jsonResponse(
      {
        ok: false,
        error: "server_error",
        phone: PHONE_DISPLAY,
      },
      500,
      cors
    );
  }
}


/* =========================================================
   CORS
========================================================= */

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");

  const allowedOrigins = parseAllowedOrigins(
    env.ALLOWED_ORIGINS
  );

  let allowOrigin = "*";

  if (allowedOrigins.length > 0) {
    if (origin && allowedOrigins.includes(origin)) {
      allowOrigin = origin;
    } else {
      allowOrigin = allowedOrigins[0];
    }
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin",
  };
}


function isOriginAllowed(request, env) {
  const allowedOrigins = parseAllowedOrigins(
    env.ALLOWED_ORIGINS
  );

  /*
   * If ALLOWED_ORIGINS is empty, allow requests.
   *
   * We can restrict this after the live Cloudflare URL
   * is confirmed.
   */

  if (allowedOrigins.length === 0) {
    return true;
  }

  const origin = request.headers.get("Origin");

  return Boolean(
    origin && allowedOrigins.includes(origin)
  );
}


function parseAllowedOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}


/* =========================================================
   RESPONSE
========================================================= */

function jsonResponse(body, status, headers) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers,
    }
  );
}


/* =========================================================
   ENVIRONMENT VARIABLES
========================================================= */

function ensureEnvironment(env) {
  const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_CHAT_ID",
  ];

  const missing = required.filter(
    (key) => !env[key]
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}`
    );
  }
}


/* =========================================================
   BOOKING NORMALIZATION
========================================================= */

function normalizeText(
  value,
  maxLength = MAX_FIELD_LENGTH
) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}


function normalizeBooking(raw) {
  const booking =
    raw && typeof raw === "object"
      ? raw
      : {};

  return {
    from: normalizeText(booking.from),
    to: normalizeText(booking.to),

    date: normalizeText(
      booking.date,
      10
    ),

    hour: Number(booking.hour),

    minute: Number(booking.minute),

    name: normalizeText(
      booking.name,
      80
    ),

    phone: normalizeText(
      booking.phone,
      32
    ),
  };
}


/* =========================================================
   VALIDATION
========================================================= */

function validateBooking(booking) {
  if (booking.from.length < 2) {
    return "invalid_from_location";
  }

  if (booking.to.length < 2) {
    return "invalid_to_location";
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      booking.date
    )
  ) {
    return "invalid_date";
  }

  /*
   * Make sure the booking date isn't in the past.
   */

  const today = new Intl.DateTimeFormat(
    "sv-SE",
    {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(new Date());

  if (booking.date < today) {
    return "date_in_past";
  }

  if (
    !Number.isInteger(booking.hour) ||
    booking.hour < 0 ||
    booking.hour > 23
  ) {
    return "invalid_hour";
  }

  if (
    !Number.isInteger(booking.minute) ||
    booking.minute < 0 ||
    booking.minute > 59
  ) {
    return "invalid_minute";
  }

  if (booking.name.length < 2) {
    return "invalid_name";
  }

  /*
   * Phone validation.
   */

  const phoneDigits =
    booking.phone.replace(/\D/g, "");

  if (
    !/^[+()\d\s-]{6,32}$/.test(
      booking.phone
    ) ||
    phoneDigits.length < 6 ||
    phoneDigits.length > 18
  ) {
    return "invalid_phone";
  }

  return "";
}


/* =========================================================
   SUPABASE
========================================================= */

async function saveToSupabase(
  env,
  booking
) {
  const supabaseUrl =
    String(env.SUPABASE_URL)
      .replace(/\/$/, "");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/bookings`,
    {
      method: "POST",

      headers: {
        apikey:
          env.SUPABASE_SERVICE_ROLE_KEY,

        Authorization:
          `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,

        "Content-Type":
          "application/json",

        Prefer:
          "return=representation",
      },

      body: JSON.stringify({
        from_location:
          booking.from,

        to_location:
          booking.to,

        booking_date:
          booking.date,

        booking_hour:
          booking.hour,

        booking_minute:
          booking.minute,

        customer_name:
          booking.name,

        customer_phone:
          booking.phone,

        status:
          "received",
      }),
    }
  );

  if (!response.ok) {
    const details =
      await response.text()
        .catch(() => "");

    console.error(
      "Supabase insert failed",
      response.status,
      details.slice(0, 500)
    );

    throw new Error(
      "supabase_insert_failed"
    );
  }

  const rows =
    await response.json()
      .catch(() => []);

  return Array.isArray(rows) &&
    rows[0]
    ? rows[0]
    : { id: null };
}


/* =========================================================
   UPDATE BOOKING STATUS
========================================================= */

async function markBookingStatus(
  env,
  id,
  status
) {
  if (!id) {
    return;
  }

  const supabaseUrl =
    String(env.SUPABASE_URL)
      .replace(/\/$/, "");

  await fetch(
    `${supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",

      headers: {
        apikey:
          env.SUPABASE_SERVICE_ROLE_KEY,

        Authorization:
          `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        status,
      }),
    }
  ).catch(
    (error) =>
      console.error(
        "Supabase status update failed",
        safeError(error)
      )
  );
}


/* =========================================================
   TELEGRAM
========================================================= */

async function sendTelegramNotification(
  env,
  booking
) {
  const text = [
    "🚕 NY TAXIBOKNING",
    "",
    `Från: ${booking.from}`,
    `Till: ${booking.to}`,
    `Datum: ${booking.date}`,
    `Tid: ${pad(booking.hour)}:${pad(
      booking.minute
    )}`,
    "",
    `Namn: ${booking.name}`,
    `Telefon: ${booking.phone}`,
  ].join("\n");

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        chat_id:
          env.TELEGRAM_CHAT_ID,

        text,

        disable_web_page_preview:
          true,
      }),
    }
  );

  if (!response.ok) {
    const details =
      await response.text()
        .catch(() => "");

    console.error(
      "Telegram send failed",
      response.status,
      details.slice(0, 500)
    );

    return {
      ok: false,
    };
  }

  const body =
    await response.json()
      .catch(() => null);

  return {
    ok: Boolean(
      body && body.ok
    ),
  };
}


/* =========================================================
   HELPERS
========================================================= */

function pad(value) {
  return String(value).padStart(
    2,
    "0"
  );
}


function safeError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}