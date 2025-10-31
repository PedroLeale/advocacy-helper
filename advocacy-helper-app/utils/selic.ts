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

function adicionarUmMes(dataStr: string): string {
  // Converte "YYYY-MM-DD" para Date, adiciona 1 mês e volta para "YYYY-MM-DD"
  const [year, month, day] = dataStr.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month - 1 porque Date usa 0-based months
  date.setMonth(date.getMonth() + 1);
  
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  
  return `${newYear}-${newMonth}-${newDay}`;
}

export function calcularFatorSelic(
  selicRecords: SelicRecord[],
  valorInicial: number,
  excluirPrimeiro: boolean = false,
  excluirUltimo: boolean = false,
  isMonthlyRate: boolean = true, // Sempre mensal agora
  dataInicial?: string, // Formato "YYYY-MM-DD" 
  dataFinal?: string // Formato "YYYY-MM-DD"
): number {
  // Usa maior precisão no cálculo acumulado
  let fator = 1;
  
  // Filtra registros baseado nas opções
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
  
  // SELIC mensal - sempre usa acúmulo simples agora
  if (dataInicial && dataFinal) {
    // SELIC mensal - aplica o ACÚMULO SIMPLES das taxas (não capitalização composta)
    let percentualAcumuladoMensal = 0;
    
    // Processa os dados da API (que são de dataInicial+1mês até dataFinal-1mês)
    recordsToUse.forEach((rec, index) => {
      const taxaMensal: number = parseFloat(rec.valor) / 100;
      if (index < 10 || index >= recordsToUse.length - 10) { // Mais logs para debug
        console.log(`✓ ${rec.data}: ${rec.valor}%`);
      }
      
      // Acúmulo simples das taxas mensais
      percentualAcumuladoMensal += taxaMensal;
      console.log(`   Percentual acumulado: ${(percentualAcumuladoMensal * 100).toFixed(6)}%`);
    });
    
    // Adiciona o último mês com 1% fixo
    const [yearFinal, monthFinal] = dataFinal.split('-');
    const ultimoMes = `01/${monthFinal}/${yearFinal}`;
    console.log(`🔴 ADICIONANDO ÚLTIMO MÊS ${ultimoMes}: 1% fixo`);
    percentualAcumuladoMensal += 0.01;
    console.log(`   Percentual acumulado FINAL: ${(percentualAcumuladoMensal * 100).toFixed(6)}%`);
    
    // Converte percentual acumulado para fator
    fator = 1 + percentualAcumuladoMensal;
  }
  
  const percentualAcumulado = (fator - 1) * 100;
  console.log(`📈 RESULTADO FINAL:`);
  console.log(`   Fator acumulado: ${fator.toFixed(8)}`);
  console.log(`   Percentual SELIC acumulado (SIMPLES): ${percentualAcumulado.toFixed(6)}%`);
  console.log(`   Valor inicial: R$ ${valorInicial.toFixed(2)}`);
  console.log(`   Valor corrigido: R$ ${(valorInicial * fator).toFixed(2)}`);
  
  return valorInicial * fator;
}
