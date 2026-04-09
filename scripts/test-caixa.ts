/**
 * Full flow test: fill form -> submit -> get results
 */
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function test() {
  console.log('Launching browser with stealth...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
    defaultViewport: { width: 1280, height: 900 },
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('Navigating...');
  await page.goto('https://www8.caixa.gov.br/siopiinternet-web/simulaOperacaoInternet.do?method=inicializarCasoUso', { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('Title:', await page.title());

  // STEP 1: Fill form
  await page.click('#pessoaF');
  await delay(2000);

  // tipoImovel = 1 (Residencial)
  await page.evaluate(() => {
    (document.getElementById('tipoImovel') as HTMLSelectElement).value = '1';
    (window as any).simuladorInternet?.carregarCategoriaImovel('1');
  });
  await delay(3000);

  // categoriaImovel = 1 (Aquisição de Imóvel Novo)
  await page.evaluate(() => {
    (document.getElementById('categoriaImovel') as HTMLSelectElement).value = '1';
    (window as any).simuladorInternet?.verificaValorReforma();
  });
  await delay(1000);

  // valorImovel
  await page.evaluate(() => { (document.getElementById('valorImovel') as HTMLInputElement).value = ''; });
  await page.type('#valorImovel', '210.000,00', { delay: 10 });

  // UF = CE
  await page.evaluate(() => {
    (document.getElementById('uf') as HTMLSelectElement).value = 'CE';
    (window as any).simuladorInternet?.alteraUf();
  });
  await delay(4000);

  // Cidade = 1423 (ICO)
  await page.evaluate(() => {
    (document.getElementById('cidade') as HTMLSelectElement).value = '1423';
  });
  await delay(500);

  // Click "Próxima etapa" 1
  console.log('Clicking step 1...');
  await page.click('#btn_next1');
  await delay(2000);

  // STEP 2: Personal data
  // rendaFamiliarBruta
  await page.evaluate(() => { (document.getElementById('rendaFamiliarBruta') as HTMLInputElement).value = ''; });
  await page.type('#rendaFamiliarBruta', '2.500,00', { delay: 10 });

  // dataNascimento (25 years old)
  await page.evaluate(() => { (document.getElementById('dataNascimento') as HTMLInputElement).value = ''; });
  await page.type('#dataNascimento', '08/04/2001', { delay: 10 });

  // FGTS cotista
  await page.evaluate(() => {
    const cb = document.getElementById('vaContaFgtsS') as HTMLInputElement;
    if (cb && !cb.checked) cb.click();
  });
  await delay(500);

  // Click "Próxima etapa" 2
  console.log('Clicking step 2 (enquadrar)...');
  await page.click('#btn_next2');
  await delay(8000);

  // Check what we got
  const pageContent = await page.evaluate(() => {
    // Get all visible text from main content area
    const resultDiv = document.getElementById('resultadoSimulacao');
    const prodDiv = document.querySelector('.content-section');

    // Check for products list
    const products = document.querySelectorAll('a[onclick*="simular"]');
    const productInfo: string[] = [];
    products.forEach(p => {
      productInfo.push(`[${p.getAttribute('onclick')?.substring(0, 100)}] ${p.textContent?.trim()}`);
    });

    // Check for error messages
    const errors = document.querySelectorAll('.ui-dialog-content, #erroSimulacao, .erro_div');
    const errorTexts: string[] = [];
    errors.forEach(e => {
      if (e.textContent?.trim()) errorTexts.push(e.textContent.trim());
    });

    // Get the main visible content
    const fieldsets = document.querySelectorAll('fieldset');
    let step3html = '';
    fieldsets.forEach((fs, idx) => {
      if (!fs.classList.contains('fieldset-inactive')) {
        step3html += `--- Fieldset ${idx} (active) ---\n${fs.innerText?.substring(0, 1000)}\n`;
      }
    });

    return {
      products: productInfo,
      errors: errorTexts,
      resultHtml: resultDiv?.innerHTML?.substring(0, 2000) || 'NO RESULT DIV',
      activeFieldsets: step3html,
      bodyText: document.body.innerText?.substring(0, 3000),
    };
  });

  console.log('\n=== PRODUCTS ===');
  console.log(pageContent.products);
  console.log('\n=== ERRORS ===');
  console.log(pageContent.errors);
  console.log('\n=== ACTIVE FIELDSETS ===');
  console.log(pageContent.activeFieldsets);
  console.log('\n=== RESULT HTML ===');
  console.log(pageContent.resultHtml.substring(0, 500));

  await page.screenshot({ path: '/Users/romulocorreia/projects/tja7-hub/docs/test-step2.png', fullPage: true });

  // If there are products, click the first one to simulate
  if (pageContent.products.length > 0) {
    console.log('\nClicking first product to simulate...');
    await page.evaluate(() => {
      const btn = document.querySelector('a[onclick*="simular"]');
      if (btn) (btn as HTMLElement).click();
    });
    await delay(8000);

    // Extract result
    const result = await page.evaluate(() => {
      const resultDiv = document.getElementById('resultadoSimulacao');
      return {
        html: resultDiv?.innerHTML?.substring(0, 5000) || 'NO RESULT',
        text: resultDiv?.innerText?.substring(0, 3000) || 'NO TEXT',
      };
    });
    console.log('\n=== SIMULATION RESULT TEXT ===');
    console.log(result.text);

    await page.screenshot({ path: '/Users/romulocorreia/projects/tja7-hub/docs/test-result.png', fullPage: true });
  }

  await browser.close();
  console.log('\nDone.');
}

test().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
