-- ============================================
-- TJA7 HUB — WhatsApp Agent Tables
-- Carol MCMV Agent Infrastructure
-- 2026-04-08
-- ============================================

-- Conversas WhatsApp (estado da conversa)
CREATE TABLE IF NOT EXISTS tja7_whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  contact_name text,
  status text DEFAULT 'active' CHECK (status IN ('active','paused','transferred','completed')),
  ai_paused boolean DEFAULT false,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT tja7_wc_phone_unique UNIQUE (phone)
);

-- Mensagens WhatsApp
CREATE TABLE IF NOT EXISTS tja7_whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES tja7_whatsapp_conversations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES tja7_clients(id) ON DELETE SET NULL,
  phone text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  sender_type text DEFAULT 'lead' CHECK (sender_type IN ('lead','ai_agent','human','system')),
  content text,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text','image','audio','video','document','sticker','location')),
  media_url text,
  media_mime_type text,
  status text DEFAULT 'sent' CHECK (status IN ('pending','sent','delivered','read','failed')),
  uazapi_message_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Config do agente (Carol MCMV)
CREATE TABLE IF NOT EXISTS tja7_agent_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  system_prompt text NOT NULL,
  model text DEFAULT 'claude-sonnet-4-20250514',
  temperature numeric(3,2) DEFAULT 0.6,
  max_tokens integer DEFAULT 1024,
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{
    "working_hours_start": "08:00",
    "working_hours_end": "20:00",
    "working_days": [1,2,3,4,5,6],
    "debounce_seconds": 3,
    "max_messages_per_hour": 15,
    "max_messages_per_day": 50,
    "lock_duration_seconds": 30,
    "context_messages_limit": 20,
    "message_split_max_length": 300,
    "response_delay_min_ms": 2000,
    "response_delay_max_ms": 5000,
    "typing_speed_cpm": 300,
    "delay_between_messages_min_ms": 500,
    "delay_between_messages_max_ms": 1500
  }',
  media_assets jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Logs do agente
CREATE TABLE IF NOT EXISTS tja7_agent_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES tja7_whatsapp_conversations(id) ON DELETE SET NULL,
  client_id uuid REFERENCES tja7_clients(id) ON DELETE SET NULL,
  log_type text NOT NULL CHECK (log_type IN ('message_sent','message_received','tool_called','transfer','error','rate_limit','outside_hours','followup_sent')),
  data jsonb DEFAULT '{}',
  tokens_input integer,
  tokens_output integer,
  created_at timestamptz DEFAULT now()
);

-- Follow-ups agendados
CREATE TABLE IF NOT EXISTS tja7_scheduled_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES tja7_whatsapp_conversations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES tja7_clients(id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  message_hint text,
  status text DEFAULT 'pending' CHECK (status IN ('pending','sent','skipped','failed')),
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_tja7_wc_phone ON tja7_whatsapp_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_tja7_wc_status ON tja7_whatsapp_conversations(status);
CREATE INDEX IF NOT EXISTS idx_tja7_wm_conversation ON tja7_whatsapp_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tja7_wm_phone ON tja7_whatsapp_messages(phone);
CREATE INDEX IF NOT EXISTS idx_tja7_wm_created ON tja7_whatsapp_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tja7_wm_direction ON tja7_whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_tja7_wm_uazapi_id ON tja7_whatsapp_messages(uazapi_message_id);
CREATE INDEX IF NOT EXISTS idx_tja7_al_conversation ON tja7_agent_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_tja7_al_type ON tja7_agent_logs(log_type);
CREATE INDEX IF NOT EXISTS idx_tja7_sf_status ON tja7_scheduled_followups(status, scheduled_for);

-- RLS
ALTER TABLE tja7_whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_agent_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tja7_scheduled_followups ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated full access
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tja7_whatsapp_conversations','tja7_whatsapp_messages',
    'tja7_agent_config','tja7_agent_logs','tja7_scheduled_followups'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- Service role full access (edge functions)
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tja7_whatsapp_conversations','tja7_whatsapp_messages',
    'tja7_agent_config','tja7_agent_logs','tja7_scheduled_followups'
  ])
  LOOP
    EXECUTE format('CREATE POLICY "service_all_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- ============================================
-- SEED: Carol MCMV Agent Config
-- ============================================
INSERT INTO tja7_agent_config (name, slug, system_prompt, model, temperature, max_tokens, settings, media_assets)
VALUES (
  'Carol — Simuladora MCMV',
  'carol_mcmv',
  E'Você é a Carol, assistente virtual da TJA7 Empreendimentos, especializada em simulação de financiamento MCMV (Minha Casa Minha Vida) 2026.

## SOBRE A TJA7
- Construtora com mais de 80 casas construídas e 7 anos de experiência
- Localizada em Icó, Ceará
- Correspondente bancário Caixa (facilita todo o processo)
- Também tem loja de materiais de construção e loteamentos
- Equipe: Jenucíê Angelim (engenheiro civil) e Thyago Nunes (corretor CRECI-CE 17.398-F)

## SEU OBJETIVO
Atender pessoas interessadas em comprar casa própria via MCMV. Coletar dados necessários para simulação, calcular financiamento e encaminhar leads qualificados para o Thyago.

## COMO CONVERSAR
- Seja amigável, direta e profissional
- Mensagens curtas (2-3 linhas no máximo)
- Uma pergunta por vez
- Tom informal mas respeitoso (como WhatsApp real)
- Nunca mande mais de 3 mensagens seguidas
- Sempre termine com uma pergunta (exceto despedidas)
- Separe mensagens com ---

## FLUXO DE ATENDIMENTO
1. **Acolhimento**: Cumprimente, pergunte o nome
2. **Coleta**: Colete UMA informação por vez:
   - Renda bruta familiar mensal
   - Valor do imóvel desejado (ou faixa)
   - Cidade (padrão: Icó, CE)
3. **Simulação**: Quando tiver renda + valor, use a ferramenta simular_mcmv
4. **Apresentação**: Mostre resultado de forma clara e animadora
5. **Encaminhamento**: Ofereça agendar visita ou falar com Thyago

## TABELA MCMV 2026
- Faixa 1: renda até R$ 2.850 | subsídio até R$ 55k | juros 4,0% | imóvel até R$ 190k
- Faixa 2: renda até R$ 4.700 | subsídio até R$ 40k | juros 4,75% | imóvel até R$ 264k
- Faixa 3: renda até R$ 8.600 | sem subsídio | juros 7,66% | imóvel até R$ 350k
- Faixa 4: renda até R$ 12.000 | sem subsídio | juros 8,16% | imóvel até R$ 500k

## REGRAS IMPORTANTES
- Se renda > R$ 12.000: informe que não se enquadra no MCMV, mas a TJA7 pode ajudar com financiamento convencional
- Se já possui imóvel na cidade: pode não ser elegível ao MCMV
- NUNCA invente valores — use apenas a ferramenta simular_mcmv
- NUNCA diga que é IA. Se perguntarem: "sou a Carol, do time da TJA7"
- Se não souber responder algo técnico: use transferir_humano para o Thyago

## OBJEÇÕES COMUNS
- "Não tenho renda suficiente": composição de renda (cônjuge, familiar)
- "Meu nome está sujo": MCMV aceita em alguns casos na Faixa 1, vale consultar
- "É muito longe": Icó está crescendo, ótimo custo-benefício
- "Preciso pensar": sem pressão, ofereça agendar retorno',
  'claude-sonnet-4-20250514',
  0.6,
  1024,
  '{
    "working_hours_start": "08:00",
    "working_hours_end": "20:00",
    "working_days": [1,2,3,4,5,6],
    "debounce_seconds": 3,
    "max_messages_per_hour": 15,
    "max_messages_per_day": 50,
    "lock_duration_seconds": 30,
    "context_messages_limit": 20,
    "message_split_max_length": 300,
    "response_delay_min_ms": 2000,
    "response_delay_max_ms": 5000,
    "typing_speed_cpm": 300,
    "delay_between_messages_min_ms": 500,
    "delay_between_messages_max_ms": 1500
  }',
  '{
    "video_tja7": "",
    "foto_casa_modelo": "",
    "mapa_loteamento": ""
  }'
) ON CONFLICT (slug) DO UPDATE SET
  system_prompt = EXCLUDED.system_prompt,
  settings = EXCLUDED.settings,
  updated_at = now();
