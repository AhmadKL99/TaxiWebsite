export async function onRequestPost(context) {
  try {
    const request = context.request;
    const env = context.env;

    // Read the booking sent by the website
    const booking = await request.json();

    // Basic validation
    const requiredFields = [
      "from",
      "to",
      "date",
      "hour",
      "minute",
      "name",
      "phone"
    ];

    for (const field of requiredFields) {
      if (
        booking[field] === undefined ||
        booking[field] === null ||
        String(booking[field]).trim() === ""
      ) {
        return jsonResponse(
          {
            success: false,
            error: `Missing field: ${field}`
          },
          400
        );
      }
    }

    // Environment variables stored securely in Cloudflare
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SECRET_KEY;
    const telegramToken = env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = env.TELEGRAM_CHAT_ID;

    if (
      !supabaseUrl ||
      !supabaseKey ||
      !telegramToken ||
      !telegramChatId
    ) {
      console.error("Missing server environment variables.");

      return jsonResponse(
        {
          success: false,
          error: "Server configuration error."
        },
        500
      );
    }

    /*
     * 1. SAVE BOOKING TO SUPABASE
     */

    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/bookings`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Prefer": "return=representation"
        },

        body: JSON.stringify({
          from_location: String(booking.from).trim(),
          to_location: String(booking.to).trim(),
          booking_date: booking.date,
          booking_hour: Number(booking.hour),
          booking_minute: Number(booking.minute),
          customer_name: String(booking.name).trim(),
          customer_phone: String(booking.phone).trim(),
          status: "new"
        })
      }
    );

    const supabaseText = await supabaseResponse.text();

    if (!supabaseResponse.ok) {
      console.error(
        "Supabase error:",
        supabaseResponse.status,
        supabaseText
      );

      return jsonResponse(
        {
          success: false,
          error: "Could not save booking."
        },
        500
      );
    }

    /*
     * 2. SEND TELEGRAM NOTIFICATION
     */

    const telegramMessage =
      "🚕 NY TAXIBOKNING\n\n" +
      `Från: ${booking.from}\n` +
      `Till: ${booking.to}\n` +
      `Datum: ${booking.date}\n` +
      `Tid: ${String(booking.hour).padStart(2, "0")}:${String(
        booking.minute
      ).padStart(2, "0")}\n\n` +
      `Namn: ${booking.name}\n` +
      `Telefon: ${booking.phone}`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${telegramToken}/sendMessage`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          chat_id: telegramChatId,
          text: telegramMessage
        })
      }
    );

    const telegramResult = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramResult.ok) {
      console.error("Telegram error:", telegramResult);

      /*
       * IMPORTANT:
       * The booking WAS saved successfully.
       * Therefore we don't pretend the booking failed.
       */

      return jsonResponse(
        {
          success: true,
          telegramSent: false,
          message:
            "Booking saved, but Telegram notification failed."
        },
        200
      );
    }

    /*
     * 3. EVERYTHING SUCCEEDED
     */

    return jsonResponse(
      {
        success: true,
        telegramSent: true
      },
      200
    );
  } catch (error) {
    console.error("Booking API error:", error);

    return jsonResponse(
      {
        success: false,
        error: "Something went wrong."
      },
      500
    );
  }
}


/*
 * JSON response helper
 */

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,

    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}


/*
 * Handle browser CORS preflight requests
 */

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,

    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}