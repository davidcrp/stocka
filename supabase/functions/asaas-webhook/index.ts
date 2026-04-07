import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json();
    console.log("ASAAS webhook event:", JSON.stringify(body));

    const { event, payment, subscription } = body;

    if (!event) {
      return new Response("No event", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Map ASAAS events to subscription status
    let newStatus: string | null = null;

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        newStatus = "active";
        break;
      case "PAYMENT_OVERDUE":
        newStatus = "overdue";
        break;
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
      case "PAYMENT_CHARGEBACK":
        newStatus = "inactive";
        break;
      case "SUBSCRIPTION_DELETED":
      case "SUBSCRIPTION_INACTIVATED":
        newStatus = "inactive";
        break;
      default:
        console.log("Unhandled event:", event);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
    }

    if (!newStatus) {
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Find the user by externalReference (userId) or subscription id
    const externalReference = payment?.externalReference || subscription?.externalReference;
    const asaasSubscriptionId = payment?.subscription || subscription?.id;

    let userId: string | null = null;

    if (externalReference) {
      userId = externalReference;
    } else if (asaasSubscriptionId) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("asaas_subscription_id", asaasSubscriptionId)
        .maybeSingle();
      userId = sub?.user_id || null;
    }

    if (!userId) {
      console.error("Could not find user for event:", event);
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    // Update subscription status
    await supabase
      .from("subscriptions")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("user_id", userId);

    // Update profile subscription status
    await supabase
      .from("profiles")
      .update({ subscription_status: newStatus })
      .eq("user_id", userId);

    console.log(`Updated user ${userId} subscription to ${newStatus}`);

    return new Response(JSON.stringify({ received: true, status: newStatus }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
