import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VEHICLE_PHOTOS_MARKER = "/storage/v1/object/public/vehicle-photos/";

const getStoragePathFromPublicUrl = (photoUrl: string) => {
  try {
    const pathname = new URL(photoUrl).pathname;
    const path = pathname.includes(VEHICLE_PHOTOS_MARKER) ? pathname.split(VEHICLE_PHOTOS_MARKER)[1] : "";
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Usuário não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new Error("Configuração do backend incompleta.");
    }

    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await authedClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Usuário não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { vehicleId } = await req.json();

    if (!vehicleId) {
      return new Response(JSON.stringify({ success: false, error: "ID do veículo é obrigatório." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("account_id, status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile?.account_id) {
      return new Response(JSON.stringify({ success: false, error: "Perfil de acesso não encontrado." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.status !== "approved") {
      return new Response(JSON.stringify({ success: false, error: "Seu usuário não tem permissão para excluir itens." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: vehicle, error: vehicleError } = await serviceClient
      .from("vehicles")
      .select("id, account_id, photos")
      .eq("id", vehicleId)
      .eq("account_id", profile.account_id)
      .maybeSingle();

    if (vehicleError) {
      throw vehicleError;
    }

    if (!vehicle) {
      return new Response(JSON.stringify({ success: false, error: "Veículo não encontrado." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: deleteTradesError } = await serviceClient
      .from("trades")
      .delete()
      .or(`vehicle_sold_id.eq.${vehicleId},vehicle_received_id.eq.${vehicleId}`);

    if (deleteTradesError) {
      throw deleteTradesError;
    }

    const { error: deleteSalesError } = await serviceClient
      .from("sales")
      .delete()
      .eq("vehicle_id", vehicleId);

    if (deleteSalesError) {
      throw deleteSalesError;
    }

    const { error: deleteVehicleError } = await serviceClient
      .from("vehicles")
      .delete()
      .eq("id", vehicleId)
      .eq("account_id", profile.account_id);

    if (deleteVehicleError) {
      throw deleteVehicleError;
    }

    const storagePaths = (vehicle.photos || [])
      .map((photoUrl: string) => getStoragePathFromPublicUrl(photoUrl))
      .filter((path: string | null): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: storageError } = await serviceClient.storage
        .from("vehicle-photos")
        .remove(storagePaths);

      if (storageError) {
        console.warn("Não foi possível remover todas as fotos do storage:", storageError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, deletedVehicleId: vehicleId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("delete-vehicle error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro interno ao excluir o veículo.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});