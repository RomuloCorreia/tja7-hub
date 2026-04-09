# Calibração MCMV — TJA7

## Problema
A fórmula exata do subsídio MCMV não é pública. A Caixa calcula internamente com base em variáveis que não divulga por completo.

## Solução: Calibrar com dados reais do Jenucíê

### Pedir pro Jenucíê rodar no simulador da Caixa esses 12 cenários:

Todos com: **Icó/CE, imóvel novo na planta, avaliação R$ 210.000**

| # | Renda | Idade | FGTS 3+anos | Dependentes | → Subsídio | → Taxa | → Parcela PRICE |
|---|-------|-------|-------------|-------------|-----------|--------|-----------------|
| 1 | 1.500 | 25 | Sim | Sim | ? | ? | ? |
| 2 | 1.500 | 25 | Não | Não | ? | ? | ? |
| 3 | 2.000 | 28 | Sim | Sim | ? | ? | ? |
| 4 | 2.000 | 28 | Não | Não | ? | ? | ? |
| 5 | 2.500 | 30 | Sim | Sim | ? | ? | ? |
| 6 | 2.500 | 30 | Não | Não | ? | ? | ? |
| 7 | 2.710 | 28 | Sim | Sim | ? | ? | ? |
| 8 | 2.850 | 35 | Sim | Não | ? | ? | ? |
| 9 | 3.000 | 35 | Sim | Sim | ? | ? | ? |
| 10 | 3.500 | 40 | Não | Sim | ? | ? | ? |
| 11 | 4.000 | 35 | Sim | Não | ? | ? | ? |
| 12 | 4.700 | 45 | Não | Não | ? | ? | ? |

### Com esses 12 pontos, conseguimos:
1. Mapear a curva de subsídio vs renda (pra Icó/CE especificamente)
2. Entender o peso do FGTS no subsídio
3. Entender o peso dos dependentes
4. Calibrar as taxas por subfaixa
5. Montar uma fórmula que bata ±5% com o simulador real

### Enquanto isso, usamos a fórmula estimada:
- Faixa Subsídio 1 (renda ≤ R$ 2.640): interpolação linear, teto R$ 47.000 (Grupo IV)
- Faixa Subsídio 2 (renda R$ 2.640 - R$ 4.400): interpolação linear, teto R$ 7.100
- Bonus FGTS 3+ anos: +R$ 3.000
- Bonus dependentes: +R$ 1.500
- Máximo: 30% do valor do imóvel

## Dados já confirmados pelo Jenucíê:
- Teto imóvel Icó: R$ 210.000
- Faixas de renda: ainda as antigas (F1 até 2.850, F2 até 4.700)
- Renda informal: aceita só até R$ 2.850 (Faixa 1)
