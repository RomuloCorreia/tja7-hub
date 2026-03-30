# TJA7 HUB — Ecossistema Inteligente

## Projeto
- **Cliente**: TJA7 Empreendimentos (Jenucíê Angelim + Thyago Nunes)
- **Localização**: Icó, Ceará
- **Consultoria**: Rômulo Correia (@romulojca)

## Stack
- React 19 + TypeScript + Vite 8 + Tailwind 4
- Supabase (yqwrhopleaonkrszvbsy — mesmo projeto RC)
- React Query + @hello-pangea/dnd + Framer Motion + Recharts + lucide-react
- Deploy: Vercel

## Design
- Logo: amarelo dourado (#F5C518) — em /public/img/tja7-logo.png
- Dark premium: bg #06060a, surface #0e0e14, accent #F5C518
- CSS: glass, glow-button, gradient-text, gradient-border, glow-pulse, text-shimmer

## Banco de Dados (prefixo tja7_)
- `tja7_clients` — base única de clientes cross-business
- `tja7_simulations` — simulações MCMV
- `tja7_properties` — imóveis/catálogo
- `tja7_lots` — lotes/loteamentos
- `tja7_constructions` — obras em andamento
- `tja7_construction_updates` — atualizações de obra (fotos, progresso)
- `tja7_materials` — estoque da loja de materiais
- `tja7_team` — equipe TJA7
- `tja7_interactions` — histórico de interações (WhatsApp, ligações, notas)

## Agentes IA (WhatsApp via UazAPI)
- **Simulador MCMV** — agents/simulador-mcmv.ts (prioridade #1)
- **Corretor Digital** — agents/corretor-digital.ts
- **Loteamento** — agents/loteamento.ts
- **Materiais** — agents/materiais.ts

## Frentes de Negócio TJA7
1. Construção civil (MCMV)
2. Correspondente bancário Caixa
3. Loja de material de construção
4. Corretagem/vendas (Thyago)
5. Loteamento (novo)
6. Caçambas de entulho (novo)
7. Franquia de blocos (novo)

## APIs
- Anthropic (Claude Sonnet): sk-ant-api03-...
- UazAPI (WhatsApp): romulocorreia.uazapi.com
- Supabase: yqwrhopleaonkrszvbsy

## Rotas
- `/login` — login
- `/app` — dashboard (KPIs)
- `/app/pipeline` — CRM kanban
- `/app/simulacoes` — calculadora MCMV + histórico
- `/app/imoveis` — catálogo de imóveis
- `/app/lotes` — gestão de loteamentos
- `/app/obras` — acompanhamento de obras
- `/app/materiais` — estoque da loja
- `/app/agentes` — painel dos agentes IA
- `/obra/:id` — portal público do cliente (acompanhamento)
