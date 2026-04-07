import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY");
const ASAAS_BASE_URL = "https://api.asaas.com/v3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ASAAS_API_KEY) {
      throw new Error("ASAAS_API_KEY not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const userEmail = user.email;

    const body = await req.json();
    const { name, cpfCnpj, phone } = body;

    if (!name || !cpfCnpj) {
      return new Response(JSON.stringify({ error: "Nome e CPF/CNPJ são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existingSub } = await serviceClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    let asaasCustomerId = existingSub?.asaas_customer_id;

    // 1. Create customer in ASAAS if not exists
    if (!asaasCustomerId) {
      const customerRes = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name,
          email: userEmail,
          cpfCnpj: cpfCnpj.replace(/\D/g, ""),
          phone: phone ? phone.replace(/\D/g, "") : undefined,
        }),
      });

      const customerData = await customerRes.json();
      console.log("ASAAS customer response:", JSON.stringify(customerData));
      if (!customerRes.ok) {
        const errorMsg = customerData.errors?.[0]?.description || "Erro ao criar cliente no ASAAS";
        throw new Error(errorMsg);
      }
      asaasCustomerId = customerData.id;
    }

    // 2. Create subscription in ASAAS
    const subscriptionRes = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: "UNDEFINED",
        value: 29.90,
        cycle: "MONTHLY",
        description: "Stocka Pro Plan - Assinatura Mensal",
        externalReference: userId,
      }),
    });

    const subscriptionData = await subscriptionRes.json();
    console.log("ASAAS subscription response:", JSON.stringify(subscriptionData));
    if (!subscriptionRes.ok) {
      const errorMsg = subscriptionData.errors?.[0]?.description || "Erro ao criar assinatura no ASAAS";
      throw new Error(errorMsg);
    }

    // 3. Save subscription in database — keep status INACTIVE until payment is confirmed via webhook
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("account_id")
      .eq("user_id", userId)
      .single();

    if (existingSub) {
      await serviceClient
        .from("subscriptions")
        .update({
          asaas_customer_id: asaasCustomerId,
          asaas_subscription_id: subscriptionData.id,
          status: "inactive",
        })
        .eq("user_id", userId);
    } else {
      await serviceClient.from("subscriptions").insert({
        user_id: userId,
        account_id: profile?.account_id,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subscriptionData.id,
        status: "inactive",
        plan: "pro",
      });
    }

    // 4. Do NOT update profile to active — webhook will do that after payment confirmation
    // Keep profile as inactive so user sees "awaiting payment" state

    // 5. Get the first pending payment to show the payment link
    let invoiceUrl = subscriptionData.paymentLink || null;

    // Try to get the invoice URL from the first payment
    if (!invoiceUrl) {
      try {
        const paymentsRes = await fetch(
          `${ASAAS_BASE_URL}/subscriptions/${subscriptionData.id}/payments`,
          {
            headers: { access_token: ASAAS_API_KEY },
          }
        );
        const paymentsData = await paymentsRes.json();
        console.log("ASAAS payments response:", JSON.stringify(paymentsData));
        if (paymentsData.data && paymentsData.data.length > 0) {
          invoiceUrl = paymentsData.data[0].invoiceUrl || null;
        }
      } catch (e) {
        console.error("Error fetching payments:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subscriptionData.id,
        invoiceUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
