import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.1/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate webhook secret
  const secret = Deno.env.get("WHATSAPP_WEBHOOK_SECRET");
  const authHeader = req.headers.get("x-webhook-secret");
  if (!secret || authHeader !== secret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const body = await req.json();
    const phone = body.phone?.replace(/\D/g, "");
    const message = body.message || "";
    const name = body.name || null;
    const direction = body.direction || "inbound";

    if (!phone || phone.length < 10) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if lead with this phone already exists
    const { data: existing } = await supabase
      .from("leads")
      .select("id, name, follow_up_count")
      .eq("phone", phone)
      .limit(1)
      .maybeSingle();

    let leadId: string;

    if (existing) {
      // Update existing lead
      leadId = existing.id;
      const updates: Record<string, unknown> = {
        last_contact_at: new Date().toISOString(),
      };
      if (name && existing.name === "WhatsApp Lead") {
        updates.name = name;
      }
      if (direction === "inbound") {
        updates.status = "novo"; // reactivate if they message again
      }
      await supabase.from("leads").update(updates).eq("id", leadId);
    } else {
      // Create new lead
      // Round-robin: get seller with fewest leads
      const { data: sellers } = await supabase
        .from("profiles")
        .select("user_id")
        .in("role", ["vendedor", "gestor", "admin"]);

      let assignedTo: string | null = null;
      if (sellers && sellers.length > 0) {
        // Count leads per seller
        const counts = await Promise.all(
          sellers.map(async (s) => {
            const { count } = await supabase
              .from("leads")
              .select("id", { count: "exact", head: true })
              .eq("assigned_to", s.user_id);
            return { userId: s.user_id, count: count || 0 };
          })
        );
        counts.sort((a, b) => a.count - b.count);
        assignedTo = counts[0].userId;
      }

      const { data: newLead, error } = await supabase
        .from("leads")
        .insert({
          name: name || "WhatsApp Lead",
          phone,
          source: "whatsapp",
          status: "novo",
          assigned_to: assignedTo,
          last_contact_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        throw new Error(`Failed to create lead: ${error.message}`);
      }
      leadId = newLead.id;
    }

    // Log the interaction
    await supabase.from("lead_interactions").insert({
      lead_id: leadId,
      action_type: direction === "inbound" ? "whatsapp_inbound" : "whatsapp_outbound",
      message: message.substring(0, 1000),
      created_by: null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        lead_id: leadId,
        is_new: !existing,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
