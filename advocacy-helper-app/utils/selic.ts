import { Money } from 'ts-money';

type SelicRecord = {
  data: string;
  valor: string;
};

type AjusteDataResult = {
  dataAjustada: string;
  foiAjustada: boolean;
};

export async function ajustarParaDiaUtil(
  dataOriginal: string, // "YYYY-MM-DD"
  serieCodigo: number
): Promise<AjusteDataResult> {
  // Converte YYYY-MM-DD para DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const dataFormatted = formatDate(dataOriginal);
  
  const dataObj = new Date(dataOriginal);
  const dataFutura = new Date(dataObj);
  dataFutura.setDate(dataFutura.getDate() + 7);
  const dataFuturaFormatted = formatDate(dataFutura.toISOString().split('T')[0]);

  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieCodigo}/dados?formato=json&dataInicial=${dataFormatted}&dataFinal=${dataFuturaFormatted}`;
  
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return { dataAjustada: dataOriginal, foiAjustada: false };
    }
    const data: SelicRecord[] = await resp.json();
    
    if (data.length === 0) {
      return { dataAjustada: dataOriginal, foiAjustada: false };
    }
    
    const primeiroDiaUtil = data[0].data; // formato DD/MM/YYYY
    const [day, month, year] = primeiroDiaUtil.split('/');
    const dataAjustadaISO = `${year}-${month}-${day}`;
    
    const foiAjustada = dataAjustadaISO !== dataOriginal;
    
    return { dataAjustada: dataAjustadaISO, foiAjustada };
  } catch (error) {
    return { dataAjustada: dataOriginal, foiAjustada: false };
  }
}

async function fetchWithRetry(url: string, maxRetries: number = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🌐 Tentativa ${attempt}/${maxRetries}: ${url}`);
      const resp = await fetch(url);
      
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
      
      const contentType = resp.headers.get('content-type');
      const responseText = await resp.text();
      
      if (!contentType?.includes('application/json') && responseText.startsWith('<?xml')) {
        throw new Error(`API retornou XML em vez de JSON`);
      }
      
      // Testa se é JSON válido
      JSON.parse(responseText);
      return responseText;
      
    } catch (error) {
      console.log(`❌ Tentativa ${attempt} falhou: ${error}`);
      if (attempt === maxRetries) {
        throw new Error(`Falha após ${maxRetries} tentativas: ${error}`);
      }
      // Aguarda antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw new Error('Unexpected error in fetchWithRetry');
}

export async function fetchSelicSerie(
  serieCodigo: number,
  dataInicial: string,  // "YYYY-MM-DD"
  dataFinal: string     // "YYYY-MM-DD"
): Promise<SelicRecord[]> {
  // Converte YYYY-MM-DD para DD/MM/YYYY
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const dataInicialDate = new Date(dataInicial);
  const dataFinalDate = new Date(dataFinal);
  const diferencaAnos = (dataFinalDate.getTime() - dataInicialDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (diferencaAnos <= 10) {
    const dataInicialFormatted = formatDate(dataInicial);
    const dataFinalFormatted = formatDate(dataFinal);

    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieCodigo}/dados?formato=json&dataInicial=${dataInicialFormatted}&dataFinal=${dataFinalFormatted}`;
    
    const responseText = await fetchWithRetry(url);
    const data: SelicRecord[] = JSON.parse(responseText);
    return data;
  }

  console.log(`Período maior que 10 anos detectado (${diferencaAnos.toFixed(1)} anos). Dividindo em múltiplas requisições...`);
  
  const allRecords: SelicRecord[] = [];
  let currentDate = new Date(dataInicial);
  const finalDate = new Date(dataFinal);

  while (currentDate < finalDate) {
    const blockEndDate = new Date(currentDate);
    blockEndDate.setFullYear(blockEndDate.getFullYear() + 10);
    
    const actualBlockEnd = blockEndDate > finalDate ? finalDate : blockEndDate;
    
    const blockStartISO = currentDate.toISOString().split('T')[0];
    const blockEndISO = actualBlockEnd.toISOString().split('T')[0];
    
    console.log(`Buscando bloco: ${blockStartISO} até ${blockEndISO}`);
    
    const blockStartFormatted = formatDate(blockStartISO);
    const blockEndFormatted = formatDate(blockEndISO);

    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serieCodigo}/dados?formato=json&dataInicial=${blockStartFormatted}&dataFinal=${blockEndFormatted}`;
    
    const responseText = await fetchWithRetry(url);
    const blockData: SelicRecord[] = JSON.parse(responseText);
    
    allRecords.push(...blockData);
    
    currentDate = new Date(actualBlockEnd);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`Total de registros obtidos em ${Math.ceil(diferencaAnos / 10)} requisições: ${allRecords.length}`);
  
  const uniqueRecords = Array.from(
    new Map(allRecords.map(record => [record.data, record])).values()
  );
  
  return uniqueRecords;
}

export function calcularFatorSelic(
  selicRecords: SelicRecord[],
  valorInicial: number,
  excluirPrimeiro: boolean = false,
  excluirUltimo: boolean = false,
  isMonthlyRate: boolean = true,
  dataInicial?: string,
  dataFinal?: string
): number {
  let fator = 1;
  
  let recordsToUse = selicRecords;
  if (excluirPrimeiro && recordsToUse.length > 0) {
    recordsToUse = recordsToUse.slice(1);
  }
  if (excluirUltimo && recordsToUse.length > 0) {
    recordsToUse = recordsToUse.slice(0, -1);
  }
  
  console.log(`📊 Calculando fator SELIC MENSAL com ${recordsToUse.length} registros:`);
  console.log(`📅 Data inicial original: ${dataInicial}`);
  console.log(`📅 Data final: ${dataFinal}`);

  if (dataInicial && dataFinal) {
    // Usa aritmética de inteiros para evitar erros de ponto flutuante
    let percentualAcumuladoBasisPoints = 0; // Em basis points (1% = 10000 bp)
    
    recordsToUse.forEach((rec, index) => {
      // Converte string para número com mais segurança
      const valorStr = rec.valor.replace(',', '.'); // Garante ponto decimal
      const taxaPercentual = Number(valorStr);
      
      if (isNaN(taxaPercentual)) {
        console.warn(`Valor SELIC inválido ignorado: "${rec.valor}" na data ${rec.data}`);
        return;
      }
      
      // Converte para basis points (1.15% = 115 bp)
      const taxaBasisPoints = Math.round(taxaPercentual * 100);
      
      if (index < 10 || index >= recordsToUse.length - 10) {
        console.log(`✓ ${rec.data}: ${rec.valor}% (${taxaBasisPoints} bp)`);
      }
      
      percentualAcumuladoBasisPoints += taxaBasisPoints;
      const percentualDisplay = percentualAcumuladoBasisPoints / 100;
      console.log(`   Percentual acumulado: ${percentualDisplay.toFixed(6)}%`);
    });
    
    const [yearFinal, monthFinal] = dataFinal.split('-');
    const ultimoMes = `01/${monthFinal}/${yearFinal}`;
    console.log(`🔴 ADICIONANDO ÚLTIMO MÊS ${ultimoMes}: 1% fixo (100 bp)`);
    percentualAcumuladoBasisPoints += 100; // 1% = 100 basis points
    
    const percentualFinalDisplay = percentualAcumuladoBasisPoints / 100;
    console.log(`   Percentual acumulado FINAL: ${percentualFinalDisplay.toFixed(6)}%`);
    
    // Converte de volta para fator (mais seguro)
    fator = 1 + (percentualAcumuladoBasisPoints / 10000);
  }
  
  const percentualAcumulado = (fator - 1) * 100;
  console.log(`📈 RESULTADO FINAL:`);
  console.log(`   Fator acumulado: ${fator.toFixed(8)}`);
  console.log(`   Percentual SELIC acumulado (SIMPLES): ${percentualAcumulado.toFixed(6)}%`);
  console.log(`   Valor inicial: R$ ${valorInicial.toFixed(2)}`);
  console.log(`   Valor corrigido: R$ ${(valorInicial * fator).toFixed(2)}`);
  
  return valorInicial * fator;
}

/**
 * Aplica correção SELIC a um valor monetário usando ts-money
 * Usa multiplicação direta do ts-money para máxima precisão
 */
export function aplicarCorrecaoSelic(
  valorInicial: Money,
  selicRecords: SelicRecord[],
  excluirPrimeiro: boolean = false,
  excluirUltimo: boolean = false,
  dataInicial?: string,
  dataFinal?: string
): Money {
  // Calcula apenas o fator de correção SELIC (sem multiplicar)
  const fatorSelic = calcularFatorSelic(
    selicRecords,
    1, // Valor base = 1 para obter apenas o fator
    excluirPrimeiro,
    excluirUltimo,
    true,
    dataInicial,
    dataFinal
  );
  
  // Multiplica usando ts-money para máxima precisão
  // Converte fator para inteiro (multiply aceita apenas inteiros)
  const fatorInteiro = Math.round(fatorSelic * 10000); // 4 casas decimais de precisão
  return valorInicial.multiply(fatorInteiro).divide(10000);
}

/**
 * Calcula multa sobre um valor usando ts-money
 */
export function calcularMulta(valor: Money, percentualMulta: number): Money {
  const valorEmReais = valor.getAmount() / 100;
  const multaEmReais = valorEmReais * (percentualMulta / 100);
  return new Money(Math.round(multaEmReais * 100), valor.getCurrency());
}

/**
 * Cria um valor Money em Real brasileiro
 */
export function criarValorBRL(valorEmReais: number): Money {
  return new Money(Math.round(valorEmReais * 100), 'BRL');
}

/**
 * Converte Money para string formatada em Real brasileiro
 */
export function formatarReal(valor: Money): string {
  const valorEmReais = valor.getAmount() / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valorEmReais);
}
