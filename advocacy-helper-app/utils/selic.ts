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
    
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Erro ao buscar SELIC série ${serieCodigo}: ${resp.status}`);
    }
    const data: SelicRecord[] = await resp.json();
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
    
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`Erro ao buscar SELIC série ${serieCodigo}: ${resp.status}`);
    }
    const blockData: SelicRecord[] = await resp.json();
    
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
  isMonthlyRate: boolean = false
): number {
  let fator = 1;
  
  let recordsToUse = selicRecords;
  if (excluirPrimeiro && recordsToUse.length > 0) {
    recordsToUse = recordsToUse.slice(1);
  }
  if (excluirUltimo && recordsToUse.length > 0) {
    recordsToUse = recordsToUse.slice(0, -1);
  }
  
  if (isMonthlyRate) {
    recordsToUse.forEach(rec => {
      const taxaMensal = parseFloat(rec.valor) / 100;
      fator = fator * (1 + taxaMensal);
    });
  } else {
    recordsToUse.forEach(rec => {
      const taxa = parseFloat(rec.valor) / 100;
      fator = fator * (1 + taxa);
    });
  }
  
  return valorInicial * fator;
}
