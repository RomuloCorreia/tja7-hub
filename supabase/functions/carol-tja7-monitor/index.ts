import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * TJA7 — Carol Monitor
 *
 * Cron job (a cada 5 min) que:
 * 1. Detecta mensagens inbound não respondidas (>2min, <24h)
 * 2. Processa follow-ups agendados
 * 3. Despacha para carol-tja7-agent
 *
 * Chamar via: POST { action: "check_unanswered" | "process_followups" }
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

    const body = await req.json().catch(() => ({}));
    const action = body.action || "check_all";

    console.log(`[Monitor TJA7] action=${action}`);

    // Verificar horário comercial (Fortaleza)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Fortaleza",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
    if (hour < 8 || hour >= 20) {
      console.log(`[Monitor TJA7] Fora do horário comercial (${hour}h)`);
      return new Response(JSON.stringify({ success: true, skipped: "outside_hours" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let dispatched = 0;
    let followupsSent = 0;

    // ============================================
    // 1. CHECK UNANSWERED MESSAGES
    // ============================================
    if (action === "check_all" || action === "check_unanswered") {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Buscar conversas ativas com mensagem inbound recente
      const { data: conversations } = await supabase
        .from("tja7_whatsapp_conversations")
        .select("id, phone, last_inbound_at, ai_paused")
        .eq("status", "active")
        .eq("ai_paused", false)
        .gte("last_inbound_at", twentyFourHoursAgo)
        .lte("last_inbound_at", twoMinAgo)
        .limit(20);

      for (const conv of conversations || []) {
        // Buscar última mensagem inbound
        const { data: lastInbound } = await supabase
          .from("tja7_whatsapp_messages")
          .select("id, content, message_type, media_url, created_at")
          .eq("conversation_id", conv.id)
          .eq("direction", "inbound")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!lastInbound) continue;

        // Verificar se já respondeu após esta mensagem
        const { data: lastOutbound } = await supabase
          .from("tja7_whatsapp_messages")
          .select("id, created_at")
          .eq("conversation_id", conv.id)
          .eq("direction", "outbound")
          .eq("sender_type", "ai_agent")
          .gte("created_at", lastInbound.created_at)
          .limit(1);

        if (lastOutbound && lastOutbound.length > 0) continue;

        // Anti-spam: verificar se Carol enviou nos últimos 60s
        const sixtySecsAgo = new Date(Date.now() - 60 * 1000).toISOString();
        const { data: recentOutbound } = await supabase
          .from("tja7_whatsapp_messages")
          .select("id")
          .eq("conversation_id", conv.id)
          .eq("direction", "outbound")
          .eq("sender_type", "ai_agent")
          .gte("created_at", sixtySecsAgo)
          .limit(1);

        if (recentOutbound && recentOutbound.length > 0) continue;

        // Buscar client_id
        const { data: client } = await supabase
          .from("tja7_clients")
          .select("id")
          .or(`phone.eq.${conv.phone},phone.ilike.%${conv.phone.slice(-11)}%`)
          .limit(1)
          .single();

        // Dispatch para agente
        console.log(`[Monitor TJA7] Dispatching para ${conv.phone}`);
        fetch(`${supabaseUrl}/functions/v1/carol-tja7-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            action: "process_message",
            phone: conv.phone,
            message: lastInbound.content,
            message_type: lastInbound.message_type,
            media_url: lastInbound.media_url,
            conversation_id: conv.id,
            client_id: client?.id || null,
            sender_name: null,
          }),
        }).catch((e) => console.error("[Monitor TJA7] Erro dispatch:", e));

        dispatched++;
      }
    }

    // ============================================
    // 2. PROCESS SCHEDULED FOLLOWUPS
    // ============================================
    if (action === "check_all" || action === "process_followups") {
      const { data: followups } = await supabase
        .from("tja7_scheduled_followups")
        .select("id, conversation_id, client_id, message_hint")
        .eq("status", "pending")
        .lte("scheduled_for", new Date().toISOString())
        .limit(10);

      for (const fp of followups || []) {
        // Buscar conversa
        const { data: conv } = await supabase
          .from("tja7_whatsapp_conversations")
          .select("phone, ai_paused")
          .eq("id", fp.conversation_id)
          .single();

        if (!conv || conv.ai_paused) {
          await supabase.from("tja7_scheduled_followups").update({ status: "skipped" }).eq("id", fp.id);
          continue;
        }

        // Verificar se lead respondeu recentemente (pausa followup)
        const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
        const { data: recentInbound } = await supabase
          .from("tja7_whatsapp_messages")
          .select("id")
          .eq("conversation_id", fp.conversation_id)
          .eq("direction", "inbound")
          .gte("created_at", sixHoursAgo)
          .limit(1);

        if (recentInbound && recentInbound.length > 0) {
          // Lead respondeu, pular follow-up
          await supabase.from("tja7_scheduled_followups").update({ status: "skipped" }).eq("id", fp.id);
          continue;
        }

        // Dispatch follow-up como mensagem do agente
        console.log(`[Monitor TJA7] Follow-up para ${conv.phone}: ${fp.message_hint}`);
        fetch(`${supabaseUrl}/functions/v1/carol-tja7-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            action: "process_message",
            phone: conv.phone,
            message: `[FOLLOW-UP AGENDADO] Contexto: ${fp.message_hint}. Retome a conversa de forma natural, sem parecer robótica. Relembre o interesse do cliente.`,
            message_type: "text",
            conversation_id: fp.conversation_id,
            client_id: fp.client_id,
            sender_name: null,
          }),
        }).catch((e) => console.error("[Monitor TJA7] Erro follow-up:", e));

        await supabase.from("tja7_scheduled_followups").update({
          status: "sent",
          sent_at: new Date().toISOString(),
        }).eq("id", fp.id);

        followupsSent++;
      }
    }

    console.log(`[Monitor TJA7] Done. Dispatched: ${dispatched}, Follow-ups: ${followupsSent}`);

    return new Response(
      JSON.stringify({ success: true, dispatched, followupsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Monitor TJA7] Erro:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
