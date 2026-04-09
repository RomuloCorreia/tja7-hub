import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * TJA7 — Enviar mensagem via UazAPI
 *
 * POST { phone, text, media_url?, media_type?, caption? }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const uazapiUrl = Deno.env.get("TJA7_UAZAPI_URL") || "";
    const uazapiToken = Deno.env.get("TJA7_UAZAPI_TOKEN") || "";

    if (!uazapiUrl || !uazapiToken) {
      console.error("[Send] TJA7_UAZAPI_URL ou TJA7_UAZAPI_TOKEN não configurado");
      return new Response(JSON.stringify({ success: false, error: "UAZAPI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, text, media_url, media_type, caption } = await req.json();

    if (!phone) {
      return new Response(JSON.stringify({ success: false, error: "phone required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let messageId = "";

    if (media_url) {
      // Enviar mídia
      const endpoint = `${uazapiUrl}/send/media`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: uazapiToken },
        body: JSON.stringify({
          number: phone,
          mediaUrl: media_url,
          mediaType: media_type || "image",
          caption: caption || "",
        }),
      });
      const data = await res.json();
      messageId = data?.key?.id || data?.messageId || "";
      console.log(`[Send] Mídia enviada para ${phone}: ${messageId}`);
    } else if (text) {
      // Enviar texto
      const endpoint = `${uazapiUrl}/send/text`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: uazapiToken },
        body: JSON.stringify({ number: phone, text }),
      });
      const data = await res.json();
      messageId = data?.key?.id || data?.messageId || "";
      console.log(`[Send] Texto enviado para ${phone}: ${messageId}`);
    } else {
      return new Response(JSON.stringify({ success: false, error: "text or media_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Send] Erro:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
