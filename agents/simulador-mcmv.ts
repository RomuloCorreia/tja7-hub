/**
 * TJA7 — Agente Simulador MCMV (WhatsApp)
 *
 * Recebe mensagem via webhook UazAPI → processa com Claude Sonnet
 * → calcula simulação MCMV → salva lead no Supabase → responde no WhatsApp
 *
 * Deploy: npx tsx agents/simulador-mcmv.ts (ou como serverless function)
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://yqwrhopleaonkrszvbsy.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ''
const UAZAPI_URL = process.env.UAZAPI_URL || 'https://romulocorreia.uazapi.com'
const UAZAPI_TOKEN = process.env.UAZAPI_TOKEN || ''

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Tabela MCMV 2026
const MCMV_TABLE = {
  '1': { maxIncome: 2850, maxSubsidy: 55000, interestRate: 4.0, maxValue: 190000 },
  '2': { maxIncome: 4700, maxSubsidy: 40000, interestRate: 4.75, maxValue: 264000 },
  '3': { maxIncome: 8600, maxSubsidy: 0, interestRate: 7.66, maxValue: 350000 },
  '4': { maxIncome: 12000, maxSubsidy: 0, interestRate: 8.16, maxValue: 500000 },
}

type MCMVFaixa = '1' | '2' | '3' | '4'

interface ConversationState {
  step: 'greeting' | 'name' | 'income' | 'income_type' | 'property_value' | 'property_type' | 'city' | 'marital' | 'dependents' | 'complete'
  data: Record<string, string | number | boolean>
}

// In-memory conversation states (em produção: usar Redis ou Supabase)
const conversations = new Map<string, ConversationState>()

function calculateMCMV(grossIncome: number, propertyValue: number) {
  let faixa: MCMVFaixa = '4'
  if (grossIncome <= 2850) faixa = '1'
  else if (grossIncome <= 4700) faixa = '2'
  else if (grossIncome <= 8600) faixa = '3'

  const config = MCMV_TABLE[faixa]
  const subsidy = config.maxSubsidy > 0 ? Math.min(config.maxSubsidy, propertyValue * 0.3) : 0
  const financingAmount = propertyValue - subsidy
  const maxInstallment = grossIncome * 0.3
  const monthlyRate = config.interestRate / 100 / 12
  const maxTermMonths = 420

  const coefficient = monthlyRate > 0
    ? (monthlyRate * Math.pow(1 + monthlyRate, maxTermMonths)) / (Math.pow(1 + monthlyRate, maxTermMonths) - 1)
    : 1 / maxTermMonths
  const installment = Math.min(financingAmount * coefficient, maxInstallment)

  return {
    faixa,
    subsidy: Math.round(subsidy),
    interestRate: config.interestRate,
    financingAmount: Math.round(financingAmount),
    maxInstallment: Math.round(maxInstallment),
    installment: Math.round(installment * 100) / 100,
    maxTermMonths,
    eligible: propertyValue <= config.maxValue,
  }
}

const SYSTEM_PROMPT = `Voce e o assistente virtual da TJA7 Empreendimentos, especializado em simulacao de financiamento MCMV (Minha Casa Minha Vida) 2026.

Voce deve:
1. Cumprimentar o cliente de forma amigavel e profissional
2. Coletar as informacoes necessarias UMA POR VEZ, de forma conversacional:
   - Nome completo
   - Renda bruta familiar (mensal)
   - Tipo de renda (CLT, autonomo, servidor publico, aposentado)
   - Valor do imovel desejado (ou faixa de valor)
   - Tipo: novo ou usado
   - Cidade (padrao: Ico, CE)
   - Estado civil
   - Possui dependentes menores?

3. Quando tiver renda e valor do imovel, calcular e apresentar:
   - Faixa MCMV
   - Subsidio estimado
   - Taxa de juros
   - Parcela estimada
   - Se o imovel esta dentro do limite da faixa

4. Ao final, informar que um consultor da TJA7 entrara em contato para dar continuidade.

Regras:
- Responda SEMPRE em portugues brasileiro
- Seja direto mas amigavel
- Use emojis com moderacao
- Nao invente dados, use apenas os dados MCMV 2026 fornecidos
- Se a renda for acima de R$ 12.000, informe que nao se enquadra no MCMV
- Sempre mencione que a TJA7 tem mais de 80 casas construidas e 7 anos de experiencia`

async function callClaude(messages: { role: string; content: string }[]) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })
  const data = await res.json()
  return data.content?.[0]?.text ?? 'Desculpe, tive um problema. Tente novamente.'
}

async function sendWhatsApp(phone: string, message: string) {
  await fetch(`${UAZAPI_URL}/sendText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${UAZAPI_TOKEN}`,
    },
    body: JSON.stringify({
      phone,
      message,
    }),
  })
}

async function notifyTeam(clientName: string, phone: string, simulation: ReturnType<typeof calculateMCMV>) {
  const teamNumbers = ['5588999033208'] // Numeros dos vendedores
  const msg = `🔔 *Novo Lead Qualificado!*

👤 ${clientName}
📱 ${phone}
💰 Faixa MCMV: ${simulation.faixa}
💵 Parcela: R$ ${simulation.installment.toLocaleString('pt-BR')}
🏠 Financiamento: R$ ${simulation.financingAmount.toLocaleString('pt-BR')}
📊 Subsidio: R$ ${simulation.subsidy.toLocaleString('pt-BR')}

_Gerado automaticamente pelo Agente TJA7_`

  for (const number of teamNumbers) {
    await sendWhatsApp(number, msg)
  }
}

// Webhook handler
export async function handleWebhook(body: {
  phone: string
  message: string
  name?: string
}) {
  const { phone, message, name } = body

  // Buscar ou criar conversa
  let state = conversations.get(phone)
  if (!state) {
    state = { step: 'greeting', data: {} }
    conversations.set(phone, state)
  }

  // Historico de mensagens para o Claude
  const { data: interactions } = await supabase
    .from('tja7_interactions')
    .select('content, ai_generated')
    .eq('client_id', phone)
    .order('created_at', { ascending: true })
    .limit(20)

  const history = (interactions ?? []).map(i => ({
    role: i.ai_generated ? 'assistant' : 'user',
    content: i.content,
  }))

  history.push({ role: 'user', content: message })

  // Chamar Claude
  const response = await callClaude(history)

  // Salvar interacoes
  // Primeiro, verificar se o cliente existe
  let { data: client } = await supabase
    .from('tja7_clients')
    .select('*')
    .eq('phone', phone.replace(/\D/g, ''))
    .single()

  if (!client) {
    const { data: newClient } = await supabase
      .from('tja7_clients')
      .insert({
        name: name || 'Lead WhatsApp',
        phone: phone.replace(/\D/g, ''),
        source: 'whatsapp',
        stage: 'novo',
        interests: ['financiamento'],
      })
      .select()
      .single()
    client = newClient
  }

  if (client) {
    // Salvar mensagem do usuario
    await supabase.from('tja7_interactions').insert({
      client_id: client.id,
      type: 'whatsapp',
      content: message,
      ai_generated: false,
    })

    // Salvar resposta do agente
    await supabase.from('tja7_interactions').insert({
      client_id: client.id,
      type: 'whatsapp',
      content: response,
      ai_generated: true,
    })

    // Detectar se tem dados suficientes para simulacao
    const incomeMatch = message.match(/(?:renda|ganho|salario).*?(\d[\d.,]+)/i)
    const valueMatch = message.match(/(?:valor|imovel|casa).*?(\d[\d.,]+)/i)

    if (incomeMatch || state.data.income) {
      if (incomeMatch) state.data.income = parseFloat(incomeMatch[1].replace(/\./g, '').replace(',', '.'))
      if (valueMatch) state.data.propertyValue = parseFloat(valueMatch[1].replace(/\./g, '').replace(',', '.'))

      if (state.data.income && state.data.propertyValue) {
        const sim = calculateMCMV(Number(state.data.income), Number(state.data.propertyValue))

        // Salvar simulacao
        await supabase.from('tja7_simulations').insert({
          client_id: client.id,
          gross_income: Number(state.data.income),
          property_value: Number(state.data.propertyValue),
          faixa: sim.faixa,
          subsidy: sim.subsidy,
          interest_rate: sim.interestRate,
          max_installment: sim.maxInstallment,
          financing_amount: sim.financingAmount,
          status: 'simulado',
        })

        // Atualizar stage do cliente
        await supabase.from('tja7_clients').update({
          stage: 'simulado',
          updated_at: new Date().toISOString(),
          last_contact_at: new Date().toISOString(),
        }).eq('id', client.id)

        // Notificar equipe
        await notifyTeam(client.name, phone, sim)

        // Limpar estado
        conversations.delete(phone)
      }
    }
  }

  // Responder no WhatsApp
  await sendWhatsApp(phone, response)

  return { success: true, response }
}

// Se rodando como script standalone
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🤖 Agente Simulador MCMV - TJA7')
  console.log('Aguardando webhooks na porta 3001...')

  // Simular webhook para teste
  const testResult = await handleWebhook({
    phone: '5588999999999',
    message: 'Oi, quero simular um financiamento',
    name: 'Teste',
  })
  console.log('Resultado teste:', testResult)
}
