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

    // Validate auth
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const userEmail = claimsData.claims.email;

    const body = await req.json();
    const { name, cpfCnpj, phone } = body;

    if (!name || !cpfCnpj) {
      return new Response(JSON.stringify({ error: "Nome e CPF/CNPJ são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has a subscription
    const { data: existingSub } = await supabase
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
          cpfCnpj,
          phone: phone || undefined,
        }),
      });

      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        console.error("ASAAS customer error:", customerData);
        throw new Error(customerData.errors?.[0]?.description || "Erro ao criar cliente no ASAAS");
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
        billingType: "UNDEFINED", // Let user choose payment method
        value: 29.90,
        cycle: "MONTHLY",
        description: "Stocka Pro Plan - Assinatura Mensal",
        externalReference: userId,
      }),
    });

    const subscriptionData = await subscriptionRes.json();
    if (!subscriptionRes.ok) {
      console.error("ASAAS subscription error:", subscriptionData);
      throw new Error(subscriptionData.errors?.[0]?.description || "Erro ao criar assinatura no ASAAS");
    }

    // 3. Save subscription in database
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
          status: "active",
        })
        .eq("user_id", userId);
    } else {
      await serviceClient.from("subscriptions").insert({
        user_id: userId,
        account_id: profile?.account_id,
        asaas_customer_id: asaasCustomerId,
        asaas_subscription_id: subscriptionData.id,
        status: "active",
        plan: "pro",
      });
    }

    // 4. Update profile subscription status
    await serviceClient
      .from("profiles")
      .update({ subscription_status: "active" })
      .eq("user_id", userId);

    // Get the payment link from the first invoice
    const invoiceUrl = subscriptionData.paymentLink || null;

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
