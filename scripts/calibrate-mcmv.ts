/**
 * Calibração MCMV — Simulador Habitacional CAIXA
 *
 * Automatiza o simulador da Caixa via Puppeteer (com stealth para bypass
 * ShieldSquare) para coletar subsídio, taxa de juros, parcela e valor
 * financiado para múltiplos cenários de renda e idade.
 *
 * Uso: npx tsx scripts/calibrate-mcmv.ts
 *
 * Produtos testados:
 *  - 100501101: MCMV FGTS (Empreendimento CAIXA)
 *  - 100501103: MCMV FGTS (genérico)
 *  - 100501126: MCMV Pró-Cotista
 */

import { createRequire } from 'module';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Config ──────────────────────────────────────────────────────────
const SIMULATOR_URL =
  'https://www8.caixa.gov.br/siopiinternet-web/simulaOperacaoInternet.do?method=inicializarCasoUso';
const UF = 'CE';
const CIDADE_VALUE = '1423'; // ICO
const CIDADE_NOME = 'Icó';
const VALOR_IMOVEL = '210.000,00';
const TIPO_IMOVEL = '1';       // Residencial
const CATEGORIA_IMOVEL = '1';  // Aquisição de Imóvel Novo

const RENDAS = [1500, 2000, 2500, 2640, 2710, 2850, 3000, 3500, 4000, 4700];
const IDADES = [25, 40];
const FGTS_OPTIONS = [
  { label: 'sem_fgts', cotista: false },
  { label: 'com_fgts', cotista: true },
];

// Which MCMV products to simulate (captured from form onclick)
// 100501103 = MCMV Recursos FGTS (genérico — o mais comum)
const TARGET_PRODUCTS = [
  { code: 100501103, name: 'MCMV Recursos FGTS' },
];

const OUTPUT_PATH = path.resolve(__dirname, '../docs/caixa-calibration-results.json');
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataNascFromAge(age: number): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear() - age}`;
}

// ── Types ───────────────────────────────────────────────────────────
interface ProductResult {
  produto: string;
  valorImovel: string;
  prazoMax: string;
  prazoEscolhido: string;
  cotaMaxima: string;
  valorEntrada: string;
  subsidio: string;
  valorFinanciamento: string;
  sistemaAmortizacao: string;
  jurosNominais: string;
  jurosEfetivos: string;
  primeiraPrestacao: string;
  ultimaPrestacao: string;
}

interface ScenarioResult {
  renda: number;
  rendaFormatada: string;
  idade: number;
  fgts: string;
  dataNascimento: string;
  produtos: ProductResult[];
  todosDisponiveis: string[];
  error?: string;
  timestamp: string;
}

// ── Single scenario ─────────────────────────────────────────────────
async function runScenario(
  browser: any,
  renda: number,
  idade: number,
  fgtsOpt: (typeof FGTS_OPTIONS)[0],
): Promise<ScenarioResult> {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  const result: ScenarioResult = {
    renda,
    rendaFormatada: `R$ ${formatBRL(renda)}`,
    idade,
    fgts: fgtsOpt.label,
    dataNascimento: dataNascFromAge(idade),
    produtos: [],
    todosDisponiveis: [],
    timestamp: new Date().toISOString(),
  };

  try {
    await page.goto(SIMULATOR_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Polyfill for esbuild __name helper that stealth plugin may inject
    await page.evaluate('window.__name = window.__name || function(fn) { return fn; }');

    // ── ETAPA 1 ─────────────────────────────────────────────
    await page.click('#pessoaF');
    await delay(2000);

    await page.evaluate((tipo: string) => {
      (document.getElementById('tipoImovel') as HTMLSelectElement).value = tipo;
      (window as any).simuladorInternet?.carregarCategoriaImovel(tipo);
    }, TIPO_IMOVEL);
    await delay(3000);

    await page.evaluate((cat: string) => {
      (document.getElementById('categoriaImovel') as HTMLSelectElement).value = cat;
      (window as any).simuladorInternet?.verificaValorReforma();
    }, CATEGORIA_IMOVEL);
    await delay(500);

    await page.evaluate(() => {
      (document.getElementById('valorImovel') as HTMLInputElement).value = '';
    });
    await page.type('#valorImovel', VALOR_IMOVEL, { delay: 5 });

    await page.evaluate((uf: string) => {
      (document.getElementById('uf') as HTMLSelectElement).value = uf;
      (window as any).simuladorInternet?.alteraUf();
    }, UF);
    await delay(4000);

    await page.evaluate((cidade: string) => {
      (document.getElementById('cidade') as HTMLSelectElement).value = cidade;
    }, CIDADE_VALUE);
    await delay(300);

    await page.click('#btn_next1');
    await delay(2000);

    // ── ETAPA 2 ─────────────────────────────────────────────
    await page.evaluate(() => {
      (document.getElementById('rendaFamiliarBruta') as HTMLInputElement).value = '';
    });
    await page.type('#rendaFamiliarBruta', formatBRL(renda), { delay: 5 });

    await page.evaluate(() => {
      (document.getElementById('dataNascimento') as HTMLInputElement).value = '';
    });
    await page.type('#dataNascimento', result.dataNascimento, { delay: 5 });

    // FGTS cotista
    if (fgtsOpt.cotista) {
      await page.evaluate(() => {
        const cb = document.getElementById('vaContaFgtsS') as HTMLInputElement;
        if (cb && !cb.checked) cb.click();
      });
      await delay(300);
    }

    await page.click('#btn_next2');
    await delay(8000);

    // ── ETAPA 3: Lista de produtos ──────────────────────────
    // Collect all available product names
    result.todosDisponiveis = await page.evaluate(() => {
      const links = document.querySelectorAll('a[onclick*="simular"]');
      return Array.from(links).map(a => a.textContent?.trim() || '');
    });

    // For each target product, click "Simular" and extract data
    for (const target of TARGET_PRODUCTS) {
      // Find the product button with matching code
      const found = await page.evaluate((code: number) => {
        const links = document.querySelectorAll('a[onclick*="simular"]');
        for (const link of links) {
          const onclick = link.getAttribute('onclick') || '';
          if (onclick.includes(String(code))) {
            (link as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, target.code);

      if (!found) {
        console.log(`    Produto ${target.code} (${target.name}) nao disponivel para este cenario`);
        // Try clicking the first MCMV product
        const clickedFirst = await page.evaluate(() => {
          const links = document.querySelectorAll('a[onclick*="simular"]');
          for (const link of links) {
            if (link.textContent?.includes('Minha Casa')) {
              (link as HTMLElement).click();
              return link.textContent?.trim();
            }
          }
          return null;
        });
        if (!clickedFirst) continue;
        console.log(`    Usando produto alternativo: ${clickedFirst}`);
      }

      await delay(8000);

      // Extract simulation results
      const prodResult = await page.evaluate(() => {
        const resultDiv = document.getElementById('resultadoSimulacao');
        if (!resultDiv) return null;

        const text = resultDiv.innerText || '';

        const extract = (pattern: RegExp): string => {
          const m = text.match(pattern);
          return m ? m[1].trim() : '';
        };

        // Parse structured data from the result text
        return {
          produto: extract(/^(.+?)(?:\n|$)/),
          valorImovel: extract(/Valor do im[oó]vel\s+R\$\s*([\d.,]+)/i),
          prazoMax: extract(/Prazo m[aá]ximo\s+(\d+)\s*meses/i),
          prazoEscolhido: extract(/Prazo escolhido\s+(\d+)\s*meses/i),
          cotaMaxima: extract(/Cota m[aá]xima[^\d]*(\d+%)/i),
          valorEntrada: extract(/Valor da entrada\s+R\$\s*([\d.,]+)/i),
          subsidio: extract(/Subs[ií]dio[^\d]*R\$\s*([\d.,]+)/i),
          valorFinanciamento: extract(/Valor do financiamento\s+R\$\s*([\d.,]+)/i),
          sistemaAmortizacao: extract(/(SAC\s*\/\s*TR|PRICE\s*\/\s*TR|SAC\s*\/\s*IPCA)/i),
          jurosNominais: extract(/Juros Nominais\s+([\d.,]+%\s*a\.a\.)/i),
          jurosEfetivos: extract(/Juros Efetivos\s+([\d.,]+%\s*a\.a\.)/i),
          primeiraPrestacao: extract(/1[ªa] Presta[çc][ãa]o\s+R\$\s*([\d.,]+)/i),
          ultimaPrestacao: extract(/[Úú]ltima Presta[çc][ãa]o\s+R\$\s*([\d.,]+)/i),
        };
      });

      if (prodResult) {
        result.produtos.push(prodResult);
      }

      // Go back to product list for next product
      // (only needed if we have multiple TARGET_PRODUCTS)
      if (TARGET_PRODUCTS.indexOf(target) < TARGET_PRODUCTS.length - 1) {
        const backBtn = await page.$('a[onclick*="voltaEtapa"]');
        if (backBtn) {
          await backBtn.click();
          await delay(3000);
        }
      }
    }
  } catch (err: any) {
    result.error = err.message;
    try {
      await page.screenshot({
        path: path.resolve(
          __dirname,
          `../docs/error-r${renda}-i${idade}-${fgtsOpt.label}.png`,
        ),
        fullPage: true,
      });
    } catch {}
  } finally {
    await page.close();
  }

  return result;
}

// ── Orchestrator ────────────────────────────────────────────────────
async function main() {
  const total = RENDAS.length * IDADES.length * FGTS_OPTIONS.length;
  console.log('=== Calibração MCMV — Simulador Habitacional CAIXA ===');
  console.log(`Cenários: ${RENDAS.length} rendas x ${IDADES.length} idades x ${FGTS_OPTIONS.length} FGTS = ${total}`);
  console.log(`UF: ${UF} | Cidade: ${CIDADE_NOME} | Imóvel: R$ ${VALOR_IMOVEL}`);
  console.log(`Saída: ${OUTPUT_PATH}\n`);

  const browser = await puppeteerExtra.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 900 },
  });

  const allResults: ScenarioResult[] = [];
  let n = 0;

  for (const renda of RENDAS) {
    for (const idade of IDADES) {
      for (const fgtsOpt of FGTS_OPTIONS) {
        n++;
        console.log(`[${n}/${total}] Renda ${formatBRL(renda)} | Idade ${idade} | ${fgtsOpt.label}`);

        const result = await runScenario(browser, renda, idade, fgtsOpt);
        allResults.push(result);

        // Log summary
        if (result.error) {
          console.log(`  ERRO: ${result.error}`);
        } else if (result.produtos.length > 0) {
          const p = result.produtos[0];
          console.log(`  Subsidio: ${p.subsidio || 'N/A'} | Juros: ${p.jurosNominais || 'N/A'} | 1a Parcela: ${p.primeiraPrestacao || 'N/A'} | Financ: ${p.valorFinanciamento || 'N/A'}`);
        } else {
          console.log(`  Nenhum produto MCMV disponível`);
        }

        // Save partial
        saveResults(allResults, n, total);

        await delay(1500);
      }
    }
  }

  await browser.close();

  // Final summary
  console.log('\n=== RESUMO ===');
  const ok = allResults.filter(r => r.produtos.length > 0);
  const fail = allResults.filter(r => r.error);
  console.log(`Sucesso: ${ok.length}/${total} | Erros: ${fail.length}/${total}`);

  if (ok.length > 0) {
    console.log('\n--- Tabela resumo (MCMV FGTS) ---');
    console.log('Renda      | Idade | FGTS     | Subsidio      | Juros       | 1a Parcela   | Financ.');
    console.log('-----------|-------|----------|---------------|-------------|-------------- |---------');
    for (const r of ok) {
      const p = r.produtos[0];
      console.log(
        `R$ ${formatBRL(r.renda).padEnd(8)} | ${String(r.idade).padEnd(5)} | ${r.fgts.padEnd(8)} | R$ ${(p.subsidio || '-').padEnd(10)} | ${(p.jurosNominais || '-').padEnd(11)} | R$ ${(p.primeiraPrestacao || '-').padEnd(10)} | R$ ${p.valorFinanciamento || '-'}`,
      );
    }
  }

  console.log(`\nArquivo: ${OUTPUT_PATH}`);
}

function saveResults(results: ScenarioResult[], done: number, total: number) {
  const output = {
    metadata: {
      simulador: SIMULATOR_URL,
      dataExecucao: new Date().toISOString(),
      parametrosFixos: {
        uf: UF,
        cidade: CIDADE_NOME,
        cidadeCode: CIDADE_VALUE,
        valorImovel: VALOR_IMOVEL,
        tipoImovel: 'Residencial',
        categoriaImovel: 'Aquisição de Imóvel Novo',
      },
      totalCenarios: total,
      cenariosConcluidos: done,
    },
    resultados: results,
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2));
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
