import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractPhone(chatid: string): string {
  return chatid.replace("@s.whatsapp.net", "").replace("@g.us", "").replace(/\D/g, "");
}

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * TJA7 — Webhook UazAPI
 *
 * Recebe mensagens do WhatsApp via UazAPI GO format:
 * { EventType, chat, message: { chatid, text, fromMe, messageid, senderName, type, mediaType, ... } }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const rawText = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawText);
    } catch {
      console.error("[Webhook TJA7] Body não é JSON válido");
      return ok({ success: false, error: "Invalid JSON" });
    }

    const eventType = String(payload.EventType || payload.event || "");
    console.log(`[Webhook TJA7] EventType: ${eventType}`);

    // Só processa mensagens
    if (!eventType.toLowerCase().includes("message")) {
      return ok({ success: true, message: "Evento ignorado" });
    }

    const message = payload.message as Record<string, unknown> | undefined;
    if (!message) {
      return ok({ success: true, message: "Sem message" });
    }

    const chatid = String(message.chatid || message.sender_pn || "");
    const fromMe = Boolean(message.fromMe);
    const whatsappMessageId = String(message.messageid || message.id || "");
    const senderName = String(message.senderName || (payload.chat as Record<string, unknown>)?.name || "");
    const messageText = String(message.text || message.content || "");
    const msgType = String(message.type || message.messageType || "text").toLowerCase();
    const mediaType = String(message.mediaType || "");

    console.log(`[Webhook TJA7] chatid=${chatid} fromMe=${fromMe} sender=${senderName}`);
    console.log(`[Webhook TJA7] text="${messageText.substring(0, 80)}" type=${msgType}`);

    if (!chatid) return ok({ success: true, message: "Sem chatid" });

    // Ignorar grupos
    if (chatid.endsWith("@g.us") || Boolean(message.isGroup)) {
      return ok({ success: true, message: "Grupo ignorado" });
    }

    // Ignorar mensagens enviadas por nós
    if (fromMe) {
      return ok({ success: true, message: "Saída ignorada" });
    }

    // Ignorar auto-welcome da instância (detectar pelo padrão)
    const isAutoWelcome = messageText.includes("Seja bem-vindo") ||
      messageText.includes("um de nossos analistas") ||
      messageText.includes("iniciar o seu atendimento") ||
      Boolean(message.wasSentByApi);
    if (isAutoWelcome) {
      console.log("[Webhook TJA7] Auto-welcome detectada, ignorando");
      return ok({ success: true, message: "Auto-welcome ignorada" });
    }

    const phone = extractPhone(chatid);

    // Determinar tipo de conteúdo
    let content = messageText;
    let contentType = "text";
    let mediaUrl = "";

    if (msgType === "image" || mediaType === "image") {
      contentType = "image";
      mediaUrl = String(message.mediaUrl || message.media || "");
      content = messageText || "[Imagem]";
    } else if (msgType === "audio" || mediaType === "audio" || msgType === "ptt") {
      contentType = "audio";
      mediaUrl = String(message.mediaUrl || message.media || "");
      content = messageText || "[Áudio]";
    } else if (msgType === "video" || mediaType === "video") {
      contentType = "video";
      mediaUrl = String(message.mediaUrl || message.media || "");
      content = messageText || "[Vídeo]";
    } else if (msgType === "document" || mediaType === "document") {
      contentType = "document";
      mediaUrl = String(message.mediaUrl || message.media || "");
      content = messageText || "[Documento]";
    } else if (msgType === "sticker") {
      contentType = "sticker";
      content = "[Sticker]";
    } else if (msgType === "location") {
      contentType = "location";
      const lat = message.latitude || message.lat;
      const lng = message.longitude || message.lng;
      content = `[Localização: ${lat}, ${lng}]`;
    }

    // Upsert conversa — reativa IA se cliente mandou mensagem nova
    const { data: conversation } = await supabase
      .from("tja7_whatsapp_conversations")
      .upsert(
        {
          phone,
          contact_name: senderName || null,
          status: "active",
          ai_paused: false,
          last_message_at: new Date().toISOString(),
          last_inbound_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "phone" }
      )
      .select("id")
      .single();

    const conversationId = conversation?.id;

    if (!conversationId) {
      console.error("[Webhook TJA7] Falha ao criar/buscar conversa");
      return ok({ success: false, error: "Conversation upsert failed" });
    }

    // Verificar duplicata
    const { data: existing } = await supabase
      .from("tja7_whatsapp_messages")
      .select("id")
      .eq("uazapi_message_id", whatsappMessageId)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`[Webhook TJA7] Mensagem duplicada: ${whatsappMessageId}`);
      return ok({ success: true, message: "Duplicata ignorada" });
    }

    // Buscar ou criar cliente
    let { data: client } = await supabase
      .from("tja7_clients")
      .select("id")
      .or(`phone.eq.${phone},phone.ilike.%${phone.slice(-11)}%`)
      .limit(1)
      .single();

    if (!client) {
      const { data: newClient } = await supabase
        .from("tja7_clients")
        .insert({
          name: senderName || "Lead WhatsApp",
          phone,
          source: "whatsapp",
          stage: "novo",
          interests: ["financiamento"],
          last_contact_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      client = newClient;
    } else {
      // Atualizar último contato
      await supabase
        .from("tja7_clients")
        .update({ last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", client.id);
    }

    // Salvar mensagem
    await supabase.from("tja7_whatsapp_messages").insert({
      conversation_id: conversationId,
      client_id: client?.id || null,
      phone,
      direction: "inbound",
      sender_type: "lead",
      content,
      message_type: contentType,
      media_url: mediaUrl || null,
      status: "delivered",
      uazapi_message_id: whatsappMessageId,
      metadata: { push_name: senderName, original_type: msgType },
    });

    console.log(`[Webhook TJA7] Mensagem salva. Disparando agente...`);

    // Disparar agente (fire-and-forget)
    const agentUrl = `${supabaseUrl}/functions/v1/carol-tja7-agent`;
    fetch(agentUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        action: "process_message",
        phone,
        message: content,
        message_type: contentType,
        media_url: mediaUrl || null,
        conversation_id: conversationId,
        client_id: client?.id || null,
        sender_name: senderName,
      }),
    }).catch((e) => console.error("[Webhook TJA7] Erro ao disparar agente:", e));

    // Marcar como lido
    const uazapiUrl = Deno.env.get("TJA7_UAZAPI_URL") || "";
    const uazapiToken = Deno.env.get("TJA7_UAZAPI_TOKEN") || "";
    if (uazapiUrl && uazapiToken) {
      fetch(`${uazapiUrl}/chat/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json", token: uazapiToken },
        body: JSON.stringify({ number: phone, read: true }),
      }).catch(() => {});
    }

    return ok({ success: true, conversationId, clientId: client?.id });
  } catch (error) {
    console.error("[Webhook TJA7] Erro:", error);
    return ok({ success: false, error: String(error) });
  }
});
