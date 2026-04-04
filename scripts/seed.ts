import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://yqwrhopleaonkrszvbsy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlxd3Job3BsZWFvbmtyc3p2YnN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NDk1NDMsImV4cCI6MjA4MjUyNTU0M30.6CBNO41BnrUth3Tn10CwpOoo6nk6id4sOn_8TDqkJgc'
)

async function seed() {
  console.log('🌱 Populando banco TJA7...\n')

  // Autenticar como usuario
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: 'romulo@rc.digital',
    password: 'Destrava2026!',
  })
  if (authError) {
    console.error('❌ Erro ao autenticar:', authError.message)
    return
  }
  console.log('✅ Autenticado como romulo@rc.digital\n')

  // === CLIENTES ===
  const clients = [
    { name: 'Maria das Gracas Silva', phone: '88999110001', email: 'maria.gracas@email.com', cpf: '111.222.333-44', source: 'whatsapp', stage: 'simulado', interests: ['financiamento', 'construcao'], score: 85, notes: 'Interesse em casa MCMV Faixa 1, mora de aluguel', tags: ['mcmv', 'urgente'] },
    { name: 'Jose Carlos Oliveira', phone: '88999110002', email: 'josecarlos@email.com', cpf: '222.333.444-55', source: 'instagram', stage: 'documentacao', interests: ['financiamento'], score: 90, notes: 'Documentacao quase completa, falta extrato FGTS', tags: ['mcmv', 'faixa2'] },
    { name: 'Ana Paula Ferreira', phone: '88999110003', email: 'anapaula@email.com', cpf: '333.444.555-66', source: 'indicacao', stage: 'aprovado', interests: ['financiamento', 'construcao'], score: 95, notes: 'Financiamento aprovado pela Caixa, aguardando inicio obra', tags: ['mcmv', 'aprovado'] },
    { name: 'Francisco Bezerra Lima', phone: '88999110004', source: 'evento', stage: 'construindo', interests: ['construcao'], score: 100, notes: 'Obra em andamento - fase alvenaria', tags: ['mcmv', 'obra'] },
    { name: 'Francisca Alves Santos', phone: '88999110005', email: 'francisca.alves@email.com', source: 'whatsapp', stage: 'entregue', interests: ['financiamento', 'construcao'], score: 100, notes: 'Casa entregue em Jan/2026, cliente satisfeita', tags: ['mcmv', 'entregue', 'case'] },
    { name: 'Raimundo Pereira Costa', phone: '88999110006', source: 'instagram', stage: 'novo', interests: ['lote', 'construcao'], score: 40, notes: 'Perguntou sobre lotes no Instagram', tags: ['lote'] },
    { name: 'Antonia Nascimento', phone: '88999110007', email: 'antonia.n@email.com', source: 'whatsapp', stage: 'novo', interests: ['financiamento'], score: 55, notes: 'Quer simular financiamento, renda de 3.500', tags: ['mcmv', 'faixa2'] },
    { name: 'Pedro Henrique Souza', phone: '88999110008', source: 'indicacao', stage: 'simulado', interests: ['imovel_pronto'], score: 70, notes: 'Procurando imovel pronto em Ico', tags: ['imovel'] },
    { name: 'Lucia Helena Rodrigues', phone: '88999110009', email: 'lucia.hr@email.com', source: 'site', stage: 'novo', interests: ['lote'], score: 35, notes: 'Interessada no loteamento Cidade Nova', tags: ['lote'] },
    { name: 'Antonio Marcos da Silva', phone: '88999110010', source: 'whatsapp', stage: 'documentacao', interests: ['financiamento', 'construcao'], score: 80, notes: 'Entregou documentos, aguardando analise Caixa', tags: ['mcmv', 'faixa1'] },
    { name: 'Tereza Cristina Moura', phone: '88999110011', source: 'evento', stage: 'perdido', interests: ['financiamento'], score: 20, notes: 'Renda insuficiente, orientada a voltar quando tiver complemento', tags: ['perdido'] },
    { name: 'Joao Batista Fernandes', phone: '88999110012', email: 'joao.bf@email.com', source: 'instagram', stage: 'simulado', interests: ['financiamento', 'lote'], score: 65, notes: 'Quer comprar lote e construir MCMV', tags: ['mcmv', 'lote'] },
    { name: 'Sandra Maria Almeida', phone: '88999110013', source: 'indicacao', stage: 'novo', interests: ['material'], score: 30, notes: 'Reformando casa, precisa de material', tags: ['material'] },
    { name: 'Carlos Eduardo Pinto', phone: '88999110014', email: 'carlos.ep@email.com', source: 'whatsapp', stage: 'aprovado', interests: ['financiamento', 'construcao'], score: 92, notes: 'Aprovado Faixa 2, obra inicia proximo mes', tags: ['mcmv', 'faixa2', 'aprovado'] },
    { name: 'Mariana Costa Freitas', phone: '88999110015', source: 'instagram', stage: 'novo', interests: ['consorcio'], score: 45, notes: 'Perguntou sobre consorcio imobiliario', tags: ['consorcio'] },
  ]

  // Verificar se ja tem dados
  const { data: existing } = await supabase.from('tja7_clients').select('id, name, stage')
  if (existing && existing.length > 5) {
    console.log(`📋 Banco ja tem ${existing.length} clientes. Pulando seed de clientes.`)
    await seedWithClients(existing)
    return
  }

  const { data: insertedClients, error: clientsError } = await supabase
    .from('tja7_clients')
    .insert(clients)
    .select('id, name, stage')

  if (clientsError) {
    console.error('❌ Erro ao inserir clientes:', clientsError.message)
    return
  }

  console.log(`✅ ${insertedClients!.length} clientes inseridos`)
  await seedWithClients(insertedClients!)
}

async function seedWithClients(clients: { id: string; name: string; stage: string }[]) {
  const findClient = (stage: string) => clients.find(c => c.stage === stage)
  const findClientByName = (partial: string) => clients.find(c => c.name.includes(partial))

  // === SIMULACOES ===
  const simuladoClient = findClient('simulado')
  const docClient = findClient('documentacao')
  const aprovadoClient = findClient('aprovado')
  const construindoClient = findClient('construindo')
  const entregueClient = findClient('entregue')

  const simulations = [
    simuladoClient && { client_id: simuladoClient.id, gross_income: 2500, property_value: 170000, property_type: 'novo', city: 'Ico', faixa: '1', subsidy: 51000, interest_rate: 4.0, max_installment: 750, max_term_months: 420, financing_amount: 119000, status: 'simulado' },
    docClient && { client_id: docClient.id, gross_income: 4200, property_value: 240000, property_type: 'novo', city: 'Ico', faixa: '2', subsidy: 40000, interest_rate: 4.75, max_installment: 1260, max_term_months: 420, financing_amount: 200000, status: 'simulado' },
    aprovadoClient && { client_id: aprovadoClient.id, gross_income: 3800, property_value: 200000, property_type: 'novo', city: 'Ico', faixa: '2', subsidy: 40000, interest_rate: 4.75, max_installment: 1140, max_term_months: 420, financing_amount: 160000, status: 'aprovado' },
    construindoClient && { client_id: construindoClient.id, gross_income: 2200, property_value: 165000, property_type: 'novo', city: 'Ico', faixa: '1', subsidy: 49500, interest_rate: 4.0, max_installment: 660, max_term_months: 420, financing_amount: 115500, status: 'aprovado' },
    entregueClient && { client_id: entregueClient.id, gross_income: 2800, property_value: 180000, property_type: 'novo', city: 'Ico', faixa: '1', subsidy: 54000, interest_rate: 4.0, max_installment: 840, max_term_months: 420, financing_amount: 126000, status: 'aprovado' },
    findClientByName('Joao Batista') && { client_id: findClientByName('Joao Batista')!.id, gross_income: 3200, property_value: 190000, property_type: 'novo', city: 'Ico', faixa: '2', subsidy: 40000, interest_rate: 4.75, max_installment: 960, max_term_months: 420, financing_amount: 150000, status: 'pendente' },
    findClientByName('Carlos Eduardo') && { client_id: findClientByName('Carlos Eduardo')!.id, gross_income: 4500, property_value: 250000, property_type: 'novo', city: 'Ico', faixa: '2', subsidy: 40000, interest_rate: 4.75, max_installment: 1350, max_term_months: 420, financing_amount: 210000, status: 'aprovado' },
    findClientByName('Antonia') && { client_id: findClientByName('Antonia')!.id, gross_income: 3500, property_value: 200000, property_type: 'novo', city: 'Ico', faixa: '2', subsidy: 40000, interest_rate: 4.75, max_installment: 1050, max_term_months: 420, financing_amount: 160000, status: 'pendente' },
  ].filter(Boolean)

  const { error: simError } = await supabase.from('tja7_simulations').insert(simulations)
  if (simError) console.error('❌ Simulacoes:', simError.message)
  else console.log(`✅ ${simulations.length} simulacoes inseridas`)

  // === IMOVEIS ===
  const properties = [
    { title: 'Casa MCMV Residencial Ico I', type: 'casa', status: 'disponivel', price: 175000, area_m2: 45, bedrooms: 2, bathrooms: 1, address: 'Rua Nova Ico, 150', neighborhood: 'Residencial Ico I', city: 'Ico', description: 'Casa nova MCMV com 2 quartos, sala, cozinha, banheiro e area de servico. Piso ceramico e forro PVC.', features: ['piso_ceramico', 'forro_pvc', 'muro', 'portao'], mcmv_eligible: true },
    { title: 'Casa MCMV Cidade Nova', type: 'casa', status: 'disponivel', price: 190000, area_m2: 52, bedrooms: 2, bathrooms: 1, address: 'Rua Principal, 200', neighborhood: 'Cidade Nova', city: 'Ico', description: 'Casa ampla com 2 quartos, garagem e quintal. Acabamento completo.', features: ['garagem', 'quintal', 'acabamento_completo'], mcmv_eligible: true },
    { title: 'Casa Padrao Alto Bairro Centro', type: 'casa', status: 'construcao', price: 320000, area_m2: 85, bedrooms: 3, bathrooms: 2, address: 'Av. Jose Evangelista, 450', neighborhood: 'Centro', city: 'Ico', description: 'Casa 3 quartos (1 suite) com garagem coberta, area gourmet.', features: ['suite', 'garagem_coberta', 'area_gourmet', 'porcelanato'], mcmv_eligible: false },
    { title: 'Casa MCMV Jardim Esperanca', type: 'casa', status: 'vendido', price: 165000, area_m2: 42, bedrooms: 2, bathrooms: 1, address: 'Rua das Flores, 80', neighborhood: 'Jardim Esperanca', city: 'Ico', description: 'Casa entregue, cliente satisfeito.', features: ['piso_ceramico', 'forro_pvc'], mcmv_eligible: true },
    { title: 'Casa MCMV Bairro Novo', type: 'casa', status: 'reservado', price: 180000, area_m2: 48, bedrooms: 2, bathrooms: 1, address: 'Rua Sao Jose, 300', neighborhood: 'Bairro Novo', city: 'Ico', description: 'Reservada para cliente aprovado, inicio de obra em breve.', features: ['piso_ceramico', 'forro_pvc', 'muro'], mcmv_eligible: true },
    { title: 'Apartamento Centro Ico', type: 'apartamento', status: 'disponivel', price: 240000, area_m2: 65, bedrooms: 2, bathrooms: 1, address: 'Av. Nogueira Acioli, 120', neighborhood: 'Centro', city: 'Ico', description: '2 quartos, varanda, vaga de garagem.', features: ['varanda', 'garagem', 'elevador'], mcmv_eligible: true },
  ]

  const { error: propError } = await supabase.from('tja7_properties').insert(properties)
  if (propError) console.error('❌ Imoveis:', propError.message)
  else console.log(`✅ ${properties.length} imoveis inseridos`)

  // === LOTES ===
  const lotes = [
    { loteamento_name: 'Cidade Nova', block: 'A', lot_number: '01', area_m2: 200, price: 35000, status: 'vendido', address: 'Quadra A, Lote 01', features: ['esquina', 'frente_rua_principal'] },
    { loteamento_name: 'Cidade Nova', block: 'A', lot_number: '02', area_m2: 180, price: 30000, status: 'vendido', address: 'Quadra A, Lote 02', features: [] },
    { loteamento_name: 'Cidade Nova', block: 'A', lot_number: '03', area_m2: 180, price: 30000, status: 'reservado', address: 'Quadra A, Lote 03', features: [] },
    { loteamento_name: 'Cidade Nova', block: 'B', lot_number: '01', area_m2: 200, price: 35000, status: 'disponivel', address: 'Quadra B, Lote 01', features: ['esquina'] },
    { loteamento_name: 'Cidade Nova', block: 'B', lot_number: '02', area_m2: 180, price: 28000, status: 'disponivel', address: 'Quadra B, Lote 02', features: [] },
    { loteamento_name: 'Cidade Nova', block: 'B', lot_number: '03', area_m2: 250, price: 42000, status: 'disponivel', address: 'Quadra B, Lote 03', features: ['frente_dupla'] },
    { loteamento_name: 'Cidade Nova', block: 'C', lot_number: '01', area_m2: 200, price: 32000, status: 'disponivel', address: 'Quadra C, Lote 01', features: [] },
    { loteamento_name: 'Cidade Nova', block: 'C', lot_number: '02', area_m2: 220, price: 38000, status: 'reservado', address: 'Quadra C, Lote 02', features: ['esquina'] },
    { loteamento_name: 'Residencial Sol Nascente', block: 'A', lot_number: '01', area_m2: 300, price: 55000, status: 'disponivel', address: 'Quadra A, Lote 01', features: ['esquina', 'frente_rua_principal'] },
    { loteamento_name: 'Residencial Sol Nascente', block: 'A', lot_number: '02', area_m2: 250, price: 45000, status: 'disponivel', address: 'Quadra A, Lote 02', features: [] },
  ]

  const { error: lotsError } = await supabase.from('tja7_lots').insert(lotes)
  if (lotsError) console.error('❌ Lotes:', lotsError.message)
  else console.log(`✅ ${lotes.length} lotes inseridos`)

  // === OBRAS ===
  const construindoClientId = construindoClient?.id
  const entregueClientId = entregueClient?.id
  const aprovadoClientId = aprovadoClient?.id

  const constructions = [
    construindoClientId && { client_id: construindoClientId, title: 'Casa MCMV - Francisco Bezerra', address: 'Rua Nova Ico, 150, Residencial Ico I', phase: 'alvenaria', progress: 28, start_date: '2026-02-15', estimated_end: '2026-08-15', notes: 'Obra dentro do cronograma' },
    entregueClientId && { client_id: entregueClientId, title: 'Casa MCMV - Francisca Alves', address: 'Rua das Flores, 80, Jardim Esperanca', phase: 'entrega', progress: 100, start_date: '2025-06-01', estimated_end: '2025-12-30', actual_end: '2026-01-10', notes: 'Entregue com sucesso' },
    aprovadoClientId && { client_id: aprovadoClientId, title: 'Casa MCMV - Ana Paula Ferreira', address: 'Rua Sao Jose, 300, Bairro Novo', phase: 'fundacao', progress: 8, start_date: '2026-03-20', estimated_end: '2026-10-20', notes: 'Inicio recente, terraplanagem concluida' },
  ].filter(Boolean)

  const { data: insertedConstructions, error: constError } = await supabase
    .from('tja7_constructions')
    .insert(constructions)
    .select('id, title, phase')

  if (constError) console.error('❌ Obras:', constError.message)
  else console.log(`✅ ${insertedConstructions!.length} obras inseridas`)

  // === ATUALIZACOES DE OBRA ===
  if (insertedConstructions?.length) {
    const obraFrancisco = insertedConstructions.find(c => c.title.includes('Francisco'))
    const obraFrancisca = insertedConstructions.find(c => c.title.includes('Francisca'))
    const obraAna = insertedConstructions.find(c => c.title.includes('Ana Paula'))

    const updates = [
      obraFrancisco && { construction_id: obraFrancisco.id, phase: 'fundacao', progress: 15, description: 'Fundacao concluida. Sapatas e vigas baldrame prontas. Solo estavel, sem necessidade de estacas.' },
      obraFrancisco && { construction_id: obraFrancisco.id, phase: 'alvenaria', progress: 28, description: 'Alvenaria em andamento. Paredes externas 70% concluidas. Iniciando paredes internas esta semana.' },
      obraFrancisca && { construction_id: obraFrancisca.id, phase: 'fundacao', progress: 15, description: 'Fundacao concluida conforme projeto.' },
      obraFrancisca && { construction_id: obraFrancisca.id, phase: 'alvenaria', progress: 30, description: 'Alvenaria concluida. Todas as paredes levantadas.' },
      obraFrancisca && { construction_id: obraFrancisca.id, phase: 'cobertura', progress: 45, description: 'Telhado instalado com telha ceramica.' },
      obraFrancisca && { construction_id: obraFrancisca.id, phase: 'instalacoes', progress: 60, description: 'Instalacoes eletricas e hidraulicas concluidas.' },
      obraFrancisca && { construction_id: obraFrancisca.id, phase: 'acabamento', progress: 75, description: 'Piso ceramico e revestimento do banheiro instalados.' },
      obraFrancisca && { construction_id: obraFrancisca.id, phase: 'pintura', progress: 90, description: 'Pintura interna e externa concluida. Cores conforme escolha da cliente.' },
      obraFrancisca && { construction_id: obraFrancisca.id, phase: 'entrega', progress: 100, description: 'Casa entregue! Cliente muito satisfeita. Limpeza final e vistoria aprovada.' },
      obraAna && { construction_id: obraAna.id, phase: 'fundacao', progress: 8, description: 'Terraplanagem concluida. Iniciando marcacao das sapatas.' },
    ].filter(Boolean)

    const { error: updError } = await supabase.from('tja7_construction_updates').insert(updates)
    if (updError) console.error('❌ Updates obra:', updError.message)
    else console.log(`✅ ${updates.length} atualizacoes de obra inseridas`)
  }

  // === MATERIAIS ===
  const materials = [
    { name: 'Cimento CP II 50kg', category: 'Cimento', sku: 'CIM-001', price: 38.90, cost: 32.00, stock_qty: 250, min_stock: 50, unit: 'saco', supplier: 'Votorantim' },
    { name: 'Tijolo Ceramico 9x14x19', category: 'Alvenaria', sku: 'TIJ-001', price: 0.85, cost: 0.55, stock_qty: 15000, min_stock: 3000, unit: 'un', supplier: 'Ceramica Ico' },
    { name: 'Areia Lavada m3', category: 'Agregados', sku: 'ARE-001', price: 120.00, cost: 85.00, stock_qty: 40, min_stock: 10, unit: 'm3', supplier: 'Areial Ico' },
    { name: 'Brita 1 m3', category: 'Agregados', sku: 'BRI-001', price: 140.00, cost: 100.00, stock_qty: 30, min_stock: 8, unit: 'm3', supplier: 'Pedreira Regional' },
    { name: 'Vergalhao CA50 10mm (12m)', category: 'Ferro', sku: 'FER-001', price: 42.50, cost: 35.00, stock_qty: 180, min_stock: 40, unit: 'barra', supplier: 'Gerdau' },
    { name: 'Vergalhao CA50 8mm (12m)', category: 'Ferro', sku: 'FER-002', price: 28.90, cost: 22.00, stock_qty: 200, min_stock: 50, unit: 'barra', supplier: 'Gerdau' },
    { name: 'Telha Ceramica Colonial', category: 'Cobertura', sku: 'TEL-001', price: 2.20, cost: 1.50, stock_qty: 5000, min_stock: 1000, unit: 'un', supplier: 'Ceramica Ico' },
    { name: 'Piso Ceramico 45x45 (m2)', category: 'Acabamento', sku: 'PIS-001', price: 32.90, cost: 24.00, stock_qty: 120, min_stock: 30, unit: 'm2', supplier: 'Eliane' },
    { name: 'Tinta Acrilica 18L Branca', category: 'Pintura', sku: 'TIN-001', price: 189.90, cost: 145.00, stock_qty: 25, min_stock: 5, unit: 'lata', supplier: 'Suvinil' },
    { name: 'Tubo PVC 100mm (6m)', category: 'Hidraulica', sku: 'TUB-001', price: 45.00, cost: 32.00, stock_qty: 8, min_stock: 15, unit: 'barra', supplier: 'Tigre' },
    { name: 'Fio Eletrico 2.5mm (100m)', category: 'Eletrica', sku: 'FIO-001', price: 185.00, cost: 140.00, stock_qty: 12, min_stock: 5, unit: 'rolo', supplier: 'Pirelli' },
    { name: 'Porta Madeira 80x210', category: 'Esquadrias', sku: 'POR-001', price: 280.00, cost: 200.00, stock_qty: 6, min_stock: 3, unit: 'un', supplier: 'Madeireira Regional' },
  ]

  const { error: matError } = await supabase.from('tja7_materials').insert(materials)
  if (matError) console.error('❌ Materiais:', matError.message)
  else console.log(`✅ ${materials.length} materiais inseridos`)

  console.log('\n🎉 Seed completo! Banco TJA7 populado com sucesso.')
}

seed().catch(console.error)
