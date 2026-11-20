import webpush from "npm:web-push@3.6.7"
import { createClient } from "npm:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || "https://iwfrojbhfihzuikxhgos.supabase.co"
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const supabase = createClient(supabaseUrl, supabaseKey)

webpush.setVapidDetails(
  "mailto:contact@pooptracker.app",
  Deno.env.get("VAPID_PUBLIC_KEY") || "",
  Deno.env.get("VAPID_PRIVATE_KEY") || ""
)

interface SendPushRequest {
  userId: string
  title: string
  body: string
  data?: any
}

Deno.serve(async (req) => {
  try {
    const body = (await req.json()) as SendPushRequest
    const { userId, title, body: notificationBody, data } = body

    // Get the user's push subscription from the database
    const { data: subscription, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (subError || !subscription) {
      return new Response(
        JSON.stringify({ error: "No push subscription found for user" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    }

    // Parse the subscription data
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    }

    // Send the push notification
    const response = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title,
        body,
        data: data || {},
        vibrate: [200, 100, 200],
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: "poop-notification"
      })
    )

    return new Response(
      JSON.stringify({ 
        success: true, 
        statusCode: response.status 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    )

  } catch (error: any) {
    console.error("Error sending push notification:", error)
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { "Content-Type": "application/json" } 
      }
    )
  }
})