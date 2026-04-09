import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// Types
// ============================================

interface AgentConfig {
  id: string;
  name: string;
  slug: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  settings: AgentSettings;
  media_assets: Record<string, string>;
}

interface AgentSettings {
  working_hours_start: string;
  working_hours_end: string;
  working_days: number[];
  debounce_seconds: number;
  max_messages_per_hour: number;
  max_messages_per_day: number;
  lock_duration_seconds: number;
  context_messages_limit: number;
  message_split_max_length: number;
  response_delay_min_ms: number;
  response_delay_max_ms: number;
  typing_speed_cpm: number;
  delay_between_messages_min_ms: number;
  delay_between_messages_max_ms: number;
}

// ============================================
// MCMV Calculator — Regras Caixa 2026 (Icó/CE - Nordeste)
// Teto imóvel Icó: R$ 210.000 (município <50k hab)
// Taxas: Nordeste não-cotista (padrão, sem FGTS informado)
// ============================================

// Teto do imóvel por faixa — Icó/CE (interior NE, <50k hab)
const ICO_MAX_VALUES: Record<string, number> = {
  "1": 210000,  // Faixa 1/2: teto municipal Icó
  "2": 210000,
  "3": 350000,  // Faixa 3: teto nacional
  "4": 500000,  // Faixa 4: teto nacional
};

// Taxa de juros por subfaixa — Nordeste (não-cotista padrão)
// Cotista FGTS teria ~0.5% menos em cada
function getInterestRate(grossIncome: number, isCotistaFGTS: boolean): { faixa: string; rate: number } {
  const cotDiscount = isCotistaFGTS ? 0.50 : 0;

  if (grossIncome <= 2000) {
    return { faixa: "1", rate: 4.50 - cotDiscount };    // NE não-cotista: 4.50%
  } else if (grossIncome <= 2850) {
    return { faixa: "1", rate: 4.75 - cotDiscount };    // NE não-cotista: 4.75%
  } else if (grossIncome <= 3500) {
    return { faixa: "2", rate: 5.25 - cotDiscount };    // NE não-cotista: 5.25%
  } else if (grossIncome <= 4700) {
    return { faixa: "2", rate: 7.00 - cotDiscount };    // NE não-cotista: 7.00% (SALTO!)
  } else if (grossIncome <= 8600) {
    return { faixa: "3", rate: isCotistaFGTS ? 7.66 : 8.16 };
  } else if (grossIncome <= 12000) {
    return { faixa: "4", rate: 10.50 };                 // Faixa 4: 10.50% fixo
  }
  return { faixa: "0", rate: 0 };
}

// Subsídio — Faixas 1 e 2 apenas (Grupo IV - interior NE)
// Interpolação linear decrescente por renda
function calculateSubsidy(grossIncome: number, propertyValue: number): number {
  if (grossIncome > 4400) return 0;  // Acima de R$ 4.400, sem subsídio

  let subsidioBase = 0;

  if (grossIncome <= 2640) {
    // Faixa Subsídio 1: até R$ 2.640 — teto Grupo IV R$ 47.000
    const fator = Math.max(0, Math.min(1, (2640 - grossIncome) / (2640 - 1500)));
    subsidioBase = 47000 * fator;
  } else {
    // Faixa Subsídio 2: R$ 2.640 a R$ 4.400 — teto Grupo IV R$ 7.100
    const fator = Math.max(0, (4400 - grossIncome) / (4400 - 2640));
    subsidioBase = 7100 * fator;
  }

  const subsidy = Math.round(subsidioBase);
  // Não pode ultrapassar 30% do valor do imóvel
  return Math.min(subsidy, Math.round(propertyValue * 0.30));
}

// Taxa admin mensal Caixa
const TAXA_ADMIN = 25;

// Seguro estimado (MIP + DFI) — simplificado para agente
// MIP ~0.03% do saldo/mês (idade média 35) + DFI ~0.0145%
const INSURANCE_RATE_MONTHLY = 0.00045;

// Teto de avaliação Icó (Faixa 1 e 2)
const TETO_AVALIACAO_ICO = 210000;
const COTA_FINANCIAMENTO = 0.80;

function calculateMCMV(grossIncome: number, custoRealCasa: number) {
  const { faixa, rate: interestRate } = getInterestRate(grossIncome, false);

  if (faixa === "0") {
    return {
      faixa: "0", eligible: false, subsidy: 0, interestRate: 0,
      valorAvaliacao: 0, financingAmount: 0, entrada: 0,
      maxInstallment: 0, installmentSac: 0, installmentPrice: 0,
      maxTermMonths: 0, maxPropertyValue: 0,
      incomeExceedsLimit: true, taxaAdmin: 0, seguroEstimado: 0,
      entradaZero: false, custoMaxSemEntrada: 0,
    };
  }

  const maxValue = ICO_MAX_VALUES[faixa] || TETO_AVALIACAO_ICO;
  const eligible = custoRealCasa <= maxValue;

  // Lógica do teto: Caixa avalia no teto, financia 80% da AVALIAÇÃO
  const valorAvaliacao = (faixa === "1" || faixa === "2") ? TETO_AVALIACAO_ICO : custoRealCasa;
  const financingAmount = Math.round(valorAvaliacao * COTA_FINANCIAMENTO);

  // Subsídio calculado sobre o perfil
  const subsidy = calculateSubsidy(grossIncome, valorAvaliacao);

  // Entrada = custo real - financiamento - subsídio
  const gap = Math.max(0, custoRealCasa - financingAmount);
  const entrada = Math.max(0, gap - subsidy);
  const entradaZero = entrada === 0;

  // Custo máximo da casa sem entrada = financiamento + subsídio
  const custoMaxSemEntrada = financingAmount + subsidy;

  const maxInstallment = grossIncome * 0.3;
  const monthlyRate = interestRate / 100 / 12;
  const maxTermMonths = 420;

  // Seguro mensal estimado (sobre saldo do financiamento)
  const seguroMensal = financingAmount * INSURANCE_RATE_MONTHLY;

  // SAC: primeira parcela
  const amortizationSac = financingAmount / maxTermMonths;
  const firstInterestSac = financingAmount * monthlyRate;
  const installmentSac = amortizationSac + firstInterestSac + seguroMensal + TAXA_ADMIN;

  // PRICE: parcela fixa
  const coefficient = monthlyRate > 0
    ? (monthlyRate * Math.pow(1 + monthlyRate, maxTermMonths)) / (Math.pow(1 + monthlyRate, maxTermMonths) - 1)
    : 1 / maxTermMonths;
  const basePriceInstallment = financingAmount * coefficient;
  const installmentPrice = basePriceInstallment + seguroMensal + TAXA_ADMIN;

  return {
    faixa,
    eligible,
    subsidy: Math.round(subsidy),
    interestRate,
    valorAvaliacao,
    financingAmount,
    entrada: Math.round(entrada),
    entradaZero,
    custoMaxSemEntrada: Math.round(custoMaxSemEntrada),
    maxInstallment: Math.round(maxInstallment),
    installmentSac: Math.round(installmentSac * 100) / 100,
    installmentPrice: Math.round(installmentPrice * 100) / 100,
    maxTermMonths,
    maxPropertyValue: maxValue,
    incomeExceedsLimit: grossIncome > 12000,
    taxaAdmin: TAXA_ADMIN,
    seguroEstimado: Math.round(seguroMensal * 100) / 100,
  };
}

// ============================================
// Tool Definitions
// ============================================

const TOOLS = [
  {
    name: "simular_mcmv",
    description: "Calcula simulação de financiamento MCMV 2026 com a lógica do teto. Caixa avalia em R$ 210.000 (teto Icó), financia 80% da avaliação. Subsídio + financiamento podem zerar a entrada. Use quando tiver renda e valor real da casa.",
    input_schema: {
      type: "object",
      properties: {
        renda_bruta: { type: "number", description: "Renda bruta familiar mensal em reais" },
        valor_imovel: { type: "number", description: "Valor REAL da casa (custo de construção), não o valor de avaliação" },
      },
      required: ["renda_bruta", "valor_imovel"],
    },
  },
  {
    name: "calcular_valor_ideal",
    description: "Calcula o valor MÁXIMO de casa que o cliente pode comprar SEM ENTRADA. Use quando o cliente NÃO tem imóvel em vista e quer saber até quanto pode comprar. Lógica: financiamento (80% do teto R$ 210k = R$ 168k) + subsídio = valor máximo sem entrada.",
    input_schema: {
      type: "object",
      properties: {
        renda_bruta: { type: "number", description: "Renda bruta familiar mensal em reais" },
      },
      required: ["renda_bruta"],
    },
  },
  {
    name: "salvar_lead",
    description: "Atualiza dados do cliente (nome, email, CPF, estado civil, etc). Use quando o cliente informar dados pessoais.",
    input_schema: {
      type: "object",
      properties: {
        nome: { type: "string", description: "Nome completo do cliente" },
        email: { type: "string", description: "Email do cliente" },
        cpf: { type: "string", description: "CPF do cliente" },
        estado_civil: { type: "string", description: "Estado civil" },
        dependentes: { type: "boolean", description: "Possui dependentes menores" },
      },
      required: [],
    },
  },
  {
    name: "mover_etapa",
    description: "Move o cliente para uma etapa do funil. Use após marcos importantes (simulação feita, documentação solicitada, etc).",
    input_schema: {
      type: "object",
      properties: {
        etapa: {
          type: "string",
          enum: ["novo", "simulado", "documentacao", "aprovado", "construindo", "entregue", "perdido"],
          description: "Nova etapa do funil",
        },
        motivo: { type: "string", description: "Motivo da mudança" },
      },
      required: ["etapa"],
    },
  },
  {
    name: "agendar_visita",
    description: "Agenda uma visita com o corretor Thyago para conhecer imóvel ou loteamento. Use quando o cliente demonstrar interesse em visitar.",
    input_schema: {
      type: "object",
      properties: {
        data: { type: "string", description: "Data sugerida (YYYY-MM-DD)" },
        horario: { type: "string", description: "Horário sugerido (HH:MM)" },
        tipo: { type: "string", enum: ["imovel", "loteamento", "obra"], description: "Tipo de visita" },
        observacao: { type: "string", description: "Observações sobre a visita" },
      },
      required: ["data", "tipo"],
    },
  },
  {
    name: "enviar_midia",
    description: "Envia foto, vídeo ou documento para o cliente. Use para mostrar imóveis, loteamentos ou materiais.",
    input_schema: {
      type: "object",
      properties: {
        tipo: { type: "string", enum: ["foto_casa", "video_tja7", "mapa_loteamento"], description: "Tipo de mídia a enviar" },
        legenda: { type: "string", description: "Legenda da mídia" },
      },
      required: ["tipo"],
    },
  },
  {
    name: "transferir_humano",
    description: "Transfere a conversa para atendimento humano (Thyago ou Jenucíê). Use quando não souber responder ou o cliente pedir.",
    input_schema: {
      type: "object",
      properties: {
        para: { type: "string", enum: ["thyago", "jenucíê"], description: "Para quem transferir" },
        motivo: { type: "string", description: "Motivo da transferência" },
        urgencia: { type: "string", enum: ["baixa", "media", "alta"], description: "Nível de urgência" },
      },
      required: ["para", "motivo"],
    },
  },
  {
    name: "agendar_followup",
    description: "Agenda um retorno futuro para o cliente. Use quando o cliente pedir tempo para pensar.",
    input_schema: {
      type: "object",
      properties: {
        horas: { type: "number", description: "Horas até o retorno (ex: 24 para amanhã)" },
        motivo: { type: "string", description: "Contexto para o retorno" },
      },
      required: ["horas", "motivo"],
    },
  },
];

// ============================================
// Helpers
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isWithinWorkingHours(settings: AgentSettings): boolean {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0");
  const currentTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  const dayOfWeek = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Fortaleza" })
  ).getDay();

  if (!settings.working_days.includes(dayOfWeek)) return false;
  if (currentTime < settings.working_hours_start) return false;
  if (currentTime > settings.working_hours_end) return false;
  return true;
}

function splitMessage(text: string): string[] {
  // Só split por --- (separador explícito). Tudo mais é 1 mensagem.
  const blocks = text.split(/---+/).map((b) => b.trim()).filter(Boolean);
  return blocks.length > 0 ? blocks : [text];
}

// ============================================
// Tool Execution
// ============================================

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: {
    supabase: ReturnType<typeof createClient>;
    clientId: string | null;
    conversationId: string;
    phone: string;
    agentConfig: AgentConfig;
  }
): Promise<string> {
  const { supabase, clientId, conversationId, phone, agentConfig } = context;

  switch (toolName) {
    case "simular_mcmv": {
      const renda = Number(toolInput.renda_bruta);
      const valor = Number(toolInput.valor_imovel);
      const sim = calculateMCMV(renda, valor);

      // Salvar simulação no banco e pegar o ID
      let simulationId = "";
      if (clientId) {
        const { data: simData } = await supabase.from("tja7_simulations").insert({
          client_id: clientId,
          gross_income: renda,
          property_value: valor,
          faixa: sim.faixa,
          subsidy: sim.subsidy,
          interest_rate: sim.interestRate,
          max_installment: sim.maxInstallment,
          financing_amount: sim.financingAmount,
          status: "simulado",
        }).select("id").single();

        simulationId = simData?.id || "";

        // Mover pra etapa simulado
        await supabase.from("tja7_clients").update({
          stage: "simulado",
          updated_at: new Date().toISOString(),
        }).eq("id", clientId);
      }

      const reportUrl = simulationId ? `https://tja7-hub.vercel.app/simulacao/${simulationId}` : "";

      // Notificar equipe
      const teamMsg = `🔔 *Nova Simulação MCMV!*\n\n📱 ${phone}\n💰 Faixa: ${sim.faixa}\n🏠 Casa: R$ ${valor.toLocaleString("pt-BR")} | Avaliação: R$ ${sim.valorAvaliacao.toLocaleString("pt-BR")}\n💵 Financ: R$ ${sim.financingAmount.toLocaleString("pt-BR")} (80%)\n📊 Subsídio: R$ ${sim.subsidy.toLocaleString("pt-BR")}\n${sim.entradaZero ? "✅ ENTRADA ZERO!" : `⚠️ Entrada: R$ ${sim.entrada.toLocaleString("pt-BR")}`}\n💵 Parcela PRICE: R$ ${sim.installmentPrice.toLocaleString("pt-BR")}/mês${reportUrl ? `\n\n📄 Relatório: ${reportUrl}` : ""}\n\n_Gerado pela Carol IA — TJA7_`;

      // Notificar Thyago
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      fetch(`${supabaseUrl}/functions/v1/uazapi-send-tja7`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ phone: "5588997454861", text: teamMsg }),
      }).catch(() => {});

      // Log
      await supabase.from("tja7_agent_logs").insert({
        conversation_id: conversationId,
        client_id: clientId,
        log_type: "tool_called",
        data: { tool: "simular_mcmv", input: toolInput, result: sim },
      });

      const entradaMsg = sim.entradaZero
        ? `ENTRADA ZERO! O financiamento (R$ ${sim.financingAmount.toLocaleString("pt-BR")}) + subsídio (R$ ${sim.subsidy.toLocaleString("pt-BR")}) cobrem o custo total da casa.`
        : `Entrada estimada: R$ ${sim.entrada.toLocaleString("pt-BR")}. Financiamento: R$ ${sim.financingAmount.toLocaleString("pt-BR")}, Subsídio: R$ ${sim.subsidy.toLocaleString("pt-BR")}.`;

      return JSON.stringify({
        success: true,
        ...sim,
        reportUrl,
        mensagem: sim.incomeExceedsLimit
          ? "Renda acima do limite MCMV (R$ 12.000). Sugerir financiamento convencional."
          : sim.eligible
            ? `Faixa ${sim.faixa} MCMV. ${entradaMsg} Parcela estimada PRICE: R$ ${sim.installmentPrice.toLocaleString("pt-BR")}/mês. Avaliação Caixa: R$ ${sim.valorAvaliacao.toLocaleString("pt-BR")}.`
            : `Faixa ${sim.faixa} — valor acima do limite. Custo máximo sem entrada pro perfil: R$ ${sim.custoMaxSemEntrada.toLocaleString("pt-BR")}.`,
        instrucao: reportUrl
          ? `IMPORTANTE: Após apresentar os números, envie o link do relatório. ${sim.entradaZero ? "Destaque que é ENTRADA ZERO — grande diferencial!" : "Explique que a entrada pode ser reduzida."} Link: ${reportUrl}`
          : "",
      });
    }

    case "calcular_valor_ideal": {
      const renda = Number(toolInput.renda_bruta);
      const sim = calculateMCMV(renda, TETO_AVALIACAO_ICO); // simula com teto pra calcular subsídio
      const custoMax = sim.financingAmount + sim.subsidy;

      await supabase.from("tja7_agent_logs").insert({
        conversation_id: conversationId,
        client_id: clientId,
        log_type: "tool_called",
        data: { tool: "calcular_valor_ideal", input: toolInput, result: { custoMax, financiamento: sim.financingAmount, subsidy: sim.subsidy, faixa: sim.faixa } },
      });

      return JSON.stringify({
        success: true,
        faixa: sim.faixa,
        custoMaxSemEntrada: custoMax,
        financiamento: sim.financingAmount,
        subsidio: sim.subsidy,
        valorAvaliacao: TETO_AVALIACAO_ICO,
        parcelaEstimada: sim.installmentPrice,
        mensagem: `Com renda de R$ ${renda.toLocaleString("pt-BR")}, o cliente pode comprar uma casa de até R$ ${custoMax.toLocaleString("pt-BR")} SEM ENTRADA. Financiamento: R$ ${sim.financingAmount.toLocaleString("pt-BR")} (80% da avaliação de R$ ${TETO_AVALIACAO_ICO.toLocaleString("pt-BR")}), subsídio estimado: R$ ${sim.subsidy.toLocaleString("pt-BR")}. Parcela estimada: R$ ${sim.installmentPrice.toLocaleString("pt-BR")}/mês.`,
        instrucao: "Apresente de forma animadora: 'Com seu perfil, você pode comprar uma casa de até R$ X sem precisar de entrada!' Depois pergunte se quer simular com um valor específico.",
      });
    }

    case "salvar_lead": {
      if (!clientId) return JSON.stringify({ success: false, error: "Sem client_id" });
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (toolInput.nome) updates.name = toolInput.nome;
      if (toolInput.email) updates.email = toolInput.email;
      if (toolInput.cpf) updates.cpf = toolInput.cpf;
      if (toolInput.estado_civil) updates.marital_status = toolInput.estado_civil;
      if (toolInput.dependentes !== undefined) updates.dependents = toolInput.dependentes;

      await supabase.from("tja7_clients").update(updates).eq("id", clientId);
      return JSON.stringify({ success: true, updated: Object.keys(updates) });
    }

    case "mover_etapa": {
      if (!clientId) return JSON.stringify({ success: false, error: "Sem client_id" });
      await supabase.from("tja7_clients").update({
        stage: toolInput.etapa,
        updated_at: new Date().toISOString(),
      }).eq("id", clientId);

      await supabase.from("tja7_agent_logs").insert({
        conversation_id: conversationId,
        client_id: clientId,
        log_type: "tool_called",
        data: { tool: "mover_etapa", etapa: toolInput.etapa, motivo: toolInput.motivo },
      });

      return JSON.stringify({ success: true, etapa: toolInput.etapa });
    }

    case "agendar_visita": {
      // Salvar como interação
      if (clientId) {
        await supabase.from("tja7_interactions").insert({
          client_id: clientId,
          type: "nota",
          content: `📅 Visita agendada: ${toolInput.tipo} em ${toolInput.data}${toolInput.horario ? ` às ${toolInput.horario}` : ""}. ${toolInput.observacao || ""}`,
          ai_generated: true,
        });
      }

      // Notificar Thyago
      const visitMsg = `📅 *Visita Agendada!*\n\n📱 ${phone}\n🏠 Tipo: ${toolInput.tipo}\n📆 Data: ${toolInput.data}${toolInput.horario ? ` às ${toolInput.horario}` : ""}\n📝 ${toolInput.observacao || "Sem obs"}\n\n_Agendado pela Carol IA_`;
      const supabaseUrl2 = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey2 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      fetch(`${supabaseUrl2}/functions/v1/uazapi-send-tja7`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey2}` },
        body: JSON.stringify({ phone: "5588997454861", text: visitMsg }),
      }).catch(() => {});

      return JSON.stringify({ success: true, data: toolInput.data, tipo: toolInput.tipo });
    }

    case "enviar_midia": {
      const mediaKey = String(toolInput.tipo);
      const mediaUrl = agentConfig.media_assets?.[mediaKey];
      if (!mediaUrl) {
        return JSON.stringify({ success: false, error: `Mídia '${mediaKey}' não configurada` });
      }

      const supabaseUrl3 = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey3 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      await fetch(`${supabaseUrl3}/functions/v1/uazapi-send-tja7`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey3}` },
        body: JSON.stringify({
          phone,
          media_url: mediaUrl,
          media_type: "image",
          caption: toolInput.legenda || "",
        }),
      });

      return JSON.stringify({ success: true, media: mediaKey });
    }

    case "transferir_humano": {
      // Pausar IA
      await supabase.from("tja7_whatsapp_conversations").update({
        ai_paused: true,
        metadata: { transferred_to: toolInput.para, reason: toolInput.motivo, urgency: toolInput.urgencia },
        updated_at: new Date().toISOString(),
      }).eq("id", conversationId);

      // Notificar
      const urgencyEmoji = toolInput.urgencia === "alta" ? "🚨" : toolInput.urgencia === "media" ? "⚠️" : "📋";
      const transferMsg = `${urgencyEmoji} *Transferência de Atendimento*\n\n📱 ${phone}\n👤 Para: ${toolInput.para}\n📝 Motivo: ${toolInput.motivo}\n\n_Carol IA pausada para este contato_`;
      const supabaseUrl4 = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey4 = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      fetch(`${supabaseUrl4}/functions/v1/uazapi-send-tja7`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey4}` },
        body: JSON.stringify({ phone: "5588997454861", text: transferMsg }),
      }).catch(() => {});

      await supabase.from("tja7_agent_logs").insert({
        conversation_id: conversationId,
        client_id: clientId,
        log_type: "transfer",
        data: { para: toolInput.para, motivo: toolInput.motivo, urgencia: toolInput.urgencia },
      });

      return JSON.stringify({ success: true, transferred_to: toolInput.para });
    }

    case "agendar_followup": {
      const horas = Number(toolInput.horas) || 24;
      const scheduledFor = new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

      await supabase.from("tja7_scheduled_followups").insert({
        conversation_id: conversationId,
        client_id: clientId,
        scheduled_for: scheduledFor,
        message_hint: String(toolInput.motivo || "Retorno agendado"),
        status: "pending",
      });

      await supabase.from("tja7_agent_logs").insert({
        conversation_id: conversationId,
        client_id: clientId,
        log_type: "tool_called",
        data: { tool: "agendar_followup", horas, motivo: toolInput.motivo, scheduled_for: scheduledFor },
      });

      return JSON.stringify({ success: true, scheduled_for: scheduledFor });
    }

    default:
      return JSON.stringify({ success: false, error: `Tool desconhecida: ${toolName}` });
  }
}

// ============================================
// Send message via UazAPI
// ============================================

async function sendWhatsAppMessage(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  text: string,
  conversationId: string,
  clientId: string | null
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const res = await fetch(`${supabaseUrl}/functions/v1/uazapi-send-tja7`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
    body: JSON.stringify({ phone, text }),
  });
  const data = await res.json();

  // Salvar mensagem de saída
  await supabase.from("tja7_whatsapp_messages").insert({
    conversation_id: conversationId,
    client_id: clientId,
    phone,
    direction: "outbound",
    sender_type: "ai_agent",
    content: text,
    message_type: "text",
    status: "sent",
    uazapi_message_id: data?.messageId || null,
    metadata: { sent_by: "carol_mcmv" },
  });
}

// ============================================
// Main Agent Handler
// ============================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json();
    const { action, phone, message, message_type, media_url, conversation_id, client_id, sender_name } = body;

    console.log(`[Carol TJA7] action=${action} phone=${phone} msg="${String(message || "").substring(0, 60)}"`);

    if (action !== "process_message") {
      return new Response(JSON.stringify({ success: false, error: "Unknown action" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carregar config do agente
    const { data: agentConfig } = await supabase
      .from("tja7_agent_config")
      .select("*")
      .eq("slug", "carol_mcmv")
      .eq("is_active", true)
      .single();

    if (!agentConfig) {
      console.error("[Carol TJA7] Agente carol_mcmv não encontrado ou inativo");
      return new Response(JSON.stringify({ success: false, error: "Agent not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const settings = agentConfig.settings as AgentSettings;

    // Verificar horário comercial
    if (!isWithinWorkingHours(settings)) {
      console.log("[Carol TJA7] Fora do horário comercial");
      await supabase.from("tja7_agent_logs").insert({
        conversation_id,
        client_id,
        log_type: "outside_hours",
        data: { phone, message },
      });
      return new Response(JSON.stringify({ success: true, skipped: "outside_hours" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se IA está pausada
    const { data: conversation } = await supabase
      .from("tja7_whatsapp_conversations")
      .select("*")
      .eq("id", conversation_id)
      .single();

    if (conversation?.ai_paused) {
      console.log("[Carol TJA7] IA pausada para esta conversa");
      return new Response(JSON.stringify({ success: true, skipped: "ai_paused" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Debounce: esperar 4 segundos para acumular mensagens rápidas
    await sleep(4000);

    // Anti-duplicação inteligente: verificar se a ÚLTIMA mensagem inbound já foi respondida
    const { data: lastInbound } = await supabase
      .from("tja7_whatsapp_messages")
      .select("id, created_at")
      .eq("conversation_id", conversation_id)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (lastInbound) {
      const { data: responseAfter } = await supabase
        .from("tja7_whatsapp_messages")
        .select("id")
        .eq("conversation_id", conversation_id)
        .eq("direction", "outbound")
        .eq("sender_type", "ai_agent")
        .gt("created_at", lastInbound.created_at)
        .limit(1);

      if (responseAfter && responseAfter.length > 0) {
        console.log("[Carol TJA7] Anti-duplicação: última inbound já foi respondida");
        return new Response(JSON.stringify({ success: true, skipped: "already_responded" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Rate limit check
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: hourCount } = await supabase
      .from("tja7_whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversation_id)
      .eq("direction", "outbound")
      .eq("sender_type", "ai_agent")
      .gte("created_at", oneHourAgo);

    if ((hourCount || 0) >= settings.max_messages_per_hour) {
      console.log(`[Carol TJA7] Rate limit atingido: ${hourCount}/h`);
      await supabase.from("tja7_agent_logs").insert({
        conversation_id,
        client_id,
        log_type: "rate_limit",
        data: { hourCount, limit: settings.max_messages_per_hour },
      });
      return new Response(JSON.stringify({ success: true, skipped: "rate_limit" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carregar histórico de mensagens
    const { data: messages } = await supabase
      .from("tja7_whatsapp_messages")
      .select("direction, sender_type, content, message_type, created_at")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(settings.context_messages_limit);

    // Montar histórico para Claude — consolidar mensagens consecutivas do mesmo role
    const conversationHistory: { role: string; content: string }[] = [];
    for (const msg of messages || []) {
      if (!msg.content) continue;
      const role = msg.direction === "inbound" ? "user" : "assistant";
      const last = conversationHistory[conversationHistory.length - 1];
      if (last && last.role === role) {
        // Consolidar: juntar com \n
        last.content += "\n" + msg.content;
      } else {
        conversationHistory.push({ role, content: msg.content });
      }
    }

    // Carregar dados do cliente
    let clientContext = "";
    if (client_id) {
      const { data: client } = await supabase
        .from("tja7_clients")
        .select("name, phone, email, cpf, marital_status, dependents, stage, interests, score, notes")
        .eq("id", client_id)
        .single();

      if (client) {
        // Não mostrar nome se for padrão do WhatsApp (push_name) — Carol deve perguntar
        const isAutoName = !client.name || client.name === "Lead WhatsApp" || client.stage === "novo";
        clientContext = `\n\n--- DADOS DO CLIENTE ---\nNome: ${isAutoName ? "Ainda nao perguntou. PERGUNTE o nome do cliente." : client.name}\nTelefone: ${client.phone}\nEmail: ${client.email || "Não informado"}\nCPF: ${client.cpf || "Não informado"}\nEstado Civil: ${client.marital_status || "Não informado"}\nDependentes: ${client.dependents ? "Sim" : "Não informado"}\nEtapa: ${client.stage}\nInteresses: ${(client.interests || []).join(", ")}\nScore: ${client.score || "Não calculado"}\nNotas: ${client.notes || "Nenhuma"}`;
      }

      // Carregar simulações anteriores
      const { data: simulations } = await supabase
        .from("tja7_simulations")
        .select("gross_income, property_value, faixa, subsidy, financing_amount, interest_rate, created_at")
        .eq("client_id", client_id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (simulations && simulations.length > 0) {
        clientContext += "\n\n--- SIMULAÇÕES ANTERIORES ---";
        for (const sim of simulations) {
          clientContext += `\n- Faixa ${sim.faixa}: Renda R$ ${sim.gross_income} | Imóvel R$ ${sim.property_value} | Subsídio R$ ${sim.subsidy} | Financ. R$ ${sim.financing_amount} (${new Date(sim.created_at).toLocaleDateString("pt-BR")})`;
        }
      }
    }

    // Montar system prompt
    const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
    // Não passa sender_name pro Claude — Carol deve PERGUNTAR o nome
    const clientName = clientContext.includes("Nome:") ? "" : "";
    const systemPrompt = `${agentConfig.system_prompt}${clientContext}\n\n--- CONTEXTO ---\nData/hora atual: ${now}\nTelefone do cliente: ${phone}\nTipo da última mensagem: ${message_type || "text"}${media_url ? `\nMídia recebida: ${media_url}` : ""}`;

    // Chamar Claude API com tools
    console.log(`[Carol TJA7] Chamando Claude ${agentConfig.model}...`);

    // Garantir que o histórico termina com a mensagem atual do usuário
    const lastMsg = conversationHistory[conversationHistory.length - 1];
    if (!lastMsg || lastMsg.role !== "user" || !lastMsg.content.includes(message.substring(0, 20))) {
      // A mensagem atual não está no histórico — adicionar
      if (lastMsg && lastMsg.role === "user") {
        lastMsg.content += "\n" + message;
      } else {
        conversationHistory.push({ role: "user", content: message });
      }
    }
    const claudeMessages = conversationHistory.length > 0 ? conversationHistory : [{ role: "user", content: message }];

    // Debug: logar histórico enviado
    await supabase.from("tja7_agent_logs").insert({
      conversation_id, client_id,
      log_type: "tool_called",
      data: { debug: "history", messages_count: claudeMessages.length, last_3: claudeMessages.slice(-3).map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content.substring(0, 80) : '[obj]' })) },
    });

    let claudeBody: Record<string, unknown> = {
      model: agentConfig.model,
      max_tokens: agentConfig.max_tokens,
      temperature: agentConfig.temperature,
      system: systemPrompt,
      messages: claudeMessages,
      tools: TOOLS,
    };

    let responseText = "";
    let totalTokensInput = 0;
    let totalTokensOutput = 0;
    const maxIterations = 5;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(claudeBody),
      });

      if (!claudeRes.ok) {
        const errText = await claudeRes.text();
        console.error(`[Carol TJA7] Erro Claude: ${claudeRes.status} — ${errText}`);
        responseText = "Desculpe, tive um problema técnico. Pode repetir?";
        break;
      }

      const claudeData = await claudeRes.json();
      totalTokensInput += claudeData.usage?.input_tokens || 0;
      totalTokensOutput += claudeData.usage?.output_tokens || 0;

      const stopReason = claudeData.stop_reason;
      const contentBlocks = claudeData.content || [];

      console.log(`[Carol TJA7] Iteration ${iteration}: stop=${stopReason}, blocks=${contentBlocks.length}, types=${contentBlocks.map((b: any) => b.type).join(",")}`);

      // Debug: salvar resposta bruta do Claude no log
      await supabase.from("tja7_agent_logs").insert({
        conversation_id,
        client_id,
        log_type: "tool_called",
        data: { debug_iteration: iteration, stop_reason: stopReason, blocks: contentBlocks.map((b: any) => ({ type: b.type, text: b.text?.substring(0, 100), tool: b.name })) },
      });

      // Extrair texto e tool calls
      let hasToolUse = false;
      const toolResults: { type: string; tool_use_id: string; content: string }[] = [];

      for (const block of contentBlocks) {
        if (block.type === "text" && block.text) {
          responseText += (responseText ? "\n" : "") + block.text;
        } else if (block.type === "tool_use") {
          hasToolUse = true;
          console.log(`[Carol TJA7] Tool call: ${block.name}(${JSON.stringify(block.input)})`);

          const result = await executeTool(block.name, block.input as Record<string, unknown>, {
            supabase,
            clientId: client_id,
            conversationId: conversation_id,
            phone,
            agentConfig: agentConfig as AgentConfig,
          });

          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
        }
      }

      // Se não tem tool_use, é a resposta final — sair do loop
      if (!hasToolUse) {
        break;
      }

      // Se tem tool_use mas stop_reason é end_turn, ainda precisamos processar os results
      // Só sai se NÃO tem tool_use

      // Continuar loop com tool results
      claudeBody = {
        ...claudeBody,
        messages: [
          ...claudeBody.messages as unknown[],
          { role: "assistant", content: contentBlocks },
          { role: "user", content: toolResults },
        ],
      };
    }

    // Se responseText vazio mas houve tool_use com resultado, forçar retry
    if (!responseText && totalTokensOutput > 0) {
      console.log("[Carol TJA7] Resposta vazia após tool_use. Forçando retry simples...");
      // Chamar Claude uma última vez só pra gerar texto baseado no contexto
      const retryRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: agentConfig.model,
          max_tokens: agentConfig.max_tokens,
          temperature: agentConfig.temperature,
          system: systemPrompt,
          messages: claudeBody.messages as unknown[],
        }),
      });
      if (retryRes.ok) {
        const retryData = await retryRes.json();
        for (const block of retryData.content || []) {
          if (block.type === "text" && block.text) {
            responseText += (responseText ? "\n" : "") + block.text;
          }
        }
        totalTokensInput += retryData.usage?.input_tokens || 0;
        totalTokensOutput += retryData.usage?.output_tokens || 0;
        console.log(`[Carol TJA7] Retry gerou ${responseText.length} chars`);
      }
    }

    // Log tokens
    await supabase.from("tja7_agent_logs").insert({
      conversation_id,
      client_id,
      log_type: "message_sent",
      tokens_input: totalTokensInput,
      tokens_output: totalTokensOutput,
      data: { model: agentConfig.model, message_length: responseText.length },
    });

    if (!responseText) {
      console.log("[Carol TJA7] Sem resposta do Claude");
      return new Response(JSON.stringify({ success: true, skipped: "no_response" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enviar resposta humanizada
    const parts = splitMessage(responseText);
    console.log(`[Carol TJA7] Enviando ${parts.length} mensagem(ns)...`);

    // Delay pré-resposta
    await sleep(randomBetween(settings.response_delay_min_ms, settings.response_delay_max_ms));

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];

      // Simular digitação
      const typingMs = Math.max(500, (part.length / (settings.typing_speed_cpm / 60)) * 1000);
      await sleep(Math.min(typingMs, 3000));

      await sendWhatsAppMessage(supabase, phone, part, conversation_id, client_id);

      // Delay entre mensagens
      if (i < parts.length - 1) {
        await sleep(randomBetween(settings.delay_between_messages_min_ms, settings.delay_between_messages_max_ms));
      }
    }

    // Salvar interação legado (tja7_interactions)
    if (client_id) {
      await supabase.from("tja7_interactions").insert({
        client_id,
        type: "whatsapp",
        content: responseText,
        ai_generated: true,
      });
    }

    console.log(`[Carol TJA7] Resposta enviada com sucesso para ${phone}`);

    return new Response(JSON.stringify({ success: true, parts: parts.length, tokens: { input: totalTokensInput, output: totalTokensOutput } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Carol TJA7] Erro:", error);
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
