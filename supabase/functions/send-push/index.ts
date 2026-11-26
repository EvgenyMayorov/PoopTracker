import webpush from "npm:web-push@3.6.7"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || "https://iwfrojbhfihzuikxhgos.supabase.co"
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

interface SendPushRequest {
  userId: string
  title: string
  body: string
  url?: string
  data?: any
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as SendPushRequest
    const { userId, title, body: notificationBody, url, data } = body

    if (!userId) {
      return new Response(JSON.stringify({ success: false, found: 0, sent: 0, failed: 0, errors: ["userId is required"] }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId)

    if (error) {
      console.error("DB error fetching subscriptions:", error)
      return new Response(JSON.stringify({ success: false, found: 0, sent: 0, failed: 0, errors: ["Database error: " + error.message] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user:", userId)
      return new Response(JSON.stringify({ success: true, found: 0, sent: 0, failed: 0, errors: ["No active push subscriptions found in DB"] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@pooptracker.app"
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || ""
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || ""

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys are not configured in Edge Function env vars")
      return new Response(JSON.stringify({ success: false, found: subscriptions.length, sent: 0, failed: subscriptions.length, errors: ["VAPID keys not configured"] }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
    }

    if (!vapidSubject.startsWith("mailto:") && !vapidSubject.startsWith("https://")) {
      console.warn("Invalid VAPID_SUBJECT format, defaulting to mailto:")
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

    // Нормализуем data.url, чтобы клик по пушу не вёл в корень домена (404).
    const pushData: Record<string, any> = data && typeof data === "object" ? { ...data } : {}
    if (url && typeof url === "string") {
      pushData.url = url
    } else if (!pushData.url || pushData.url === "/") {
      pushData.url = "./"
    }

    const payload = JSON.stringify({ title, body: notificationBody, data: pushData })

    let sentCount = 0
    let failedCount = 0
    const errorDetails: string[] = []

    for (const sub of subscriptions) {
      const subId = String(sub.id ?? sub.endpoint)
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
        sentCount++
      } catch (pushErr: any) {
        failedCount++
        const statusCode = pushErr.statusCode || "unknown"
        const message = pushErr.message || String(pushErr)

        console.error("Push send failed for subscription " + subId.substring(0, 8) + ":", { statusCode, message, endpoint: sub.endpoint.substring(0, 50) + "..." })

        if (statusCode === 410 || statusCode === 404) {
          try {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", sub.id)
            console.log("Deleted expired/invalid subscription " + subId)
          } catch (delErr) {
            console.error("Failed to delete subscription " + subId + ":", delErr)
          }
        }

        errorDetails.push(statusCode + " - " + message)
      }
    }

    return new Response(JSON.stringify({ success: failedCount === 0, found: subscriptions.length, sent: sentCount, failed: failedCount, errors: errorDetails }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
  } catch (err: any) {
    console.error("Push function error:", err)
    return new Response(JSON.stringify({ success: false, found: 0, sent: 0, failed: 0, errors: ["Function error: " + (err.message || String(err))] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      })
  }
})
