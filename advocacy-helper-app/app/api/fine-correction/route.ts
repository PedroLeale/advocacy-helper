import { NextRequest, NextResponse } from 'next/server';
import { fetchSelicSerie, calcularFatorSelic, ajustarParaDiaUtil } from '@/utils/selic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { originalFineValue, correctionStartDate, finalDate, finePercentage, calculationType = 'daily' } = body;

    if (!originalFineValue || !correctionStartDate || !finalDate || !finePercentage) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: originalFineValue, correctionStartDate, finalDate, finePercentage' },
        { status: 400 }
      );
    }

    // Série 4390 = Taxa SELIC acumulada no mês (% ao mês) - sempre mensal
    const serieCodigo = 4390;
    
    const adjustedStartDate = await ajustarParaDiaUtil(correctionStartDate, serieCodigo);
    const adjustedFinalDate = await ajustarParaDiaUtil(finalDate, serieCodigo);
    
    console.log('Data inicial original:', correctionStartDate, '-> ajustada:', adjustedStartDate.dataAjustada);
    console.log('Data final original:', finalDate, '-> ajustada:', adjustedFinalDate.dataAjustada);
    
    // Sempre é taxa mensal
    const isMonthly = true;
    
    // Lógica MENSAL: busca dados de dataInicial+1mês até dataFinal-1mês
    const dataInicialOriginal = adjustedStartDate.dataAjustada;
    const dataFinalOriginal = adjustedFinalDate.dataAjustada;
    
    // Adiciona 1 mês à data inicial
    const [year, month, day] = adjustedStartDate.dataAjustada.split('-').map(Number);
    const dataInicialMais1Mes = new Date(year, month - 1 + 1, day);
    const dataInicialParaBusca = dataInicialMais1Mes.toISOString().split('T')[0];
    
    // Subtrai 1 mês da data final
    const [yearF, monthF, dayF] = adjustedFinalDate.dataAjustada.split('-').map(Number);
    const dataFinalMenos1Mes = new Date(yearF, monthF - 1 - 1, dayF);
    const dataFinalParaBusca = dataFinalMenos1Mes.toISOString().split('T')[0];
    
    console.log(`📅 MULTA MENSAL - Original: ${dataInicialOriginal} a ${dataFinalOriginal}`);
    console.log(`📅 MULTA MENSAL - Busca API: ${dataInicialParaBusca} a ${dataFinalParaBusca} (último mês será 1%)`);
    
    // Busca os dados da API do Banco Central
    const selicRecords = await fetchSelicSerie(serieCodigo, dataInicialParaBusca, dataFinalParaBusca);

    if (selicRecords.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado encontrado para o período informado' },
        { status: 404 }
      );
    }

    console.log(`Total de registros encontrados: ${selicRecords.length}`);
    console.log(`Primeiro registro:`, selicRecords[0]);
    console.log(`Último registro:`, selicRecords[selicRecords.length - 1]);

    // Cálculo da multa punitiva
    const originalFineNum = parseFloat(originalFineValue);
    const finePercentageNum = parseFloat(finePercentage);
    
    // 1. Aplica a porcentagem da multa sobre o valor original
    const fineValue = originalFineNum * (finePercentageNum / 100);
    
    // 2. Calcula o FATOR SELIC acumulado (uma única vez)
    // Usa a data final de cálculo (não a ajustada) para determinar o mês atual
    const fatorSelic = calcularFatorSelic(selicRecords, 1, false, false, true, dataInicialOriginal, dataFinalOriginal);
    
    // 3. Correção monetária: multa × fator SELIC
    const correctedFine = fineValue * fatorSelic;
    const monetaryCorrection = correctedFine - fineValue;
    
    // 4. Juros de mora: aplica o incremento do fator sobre a multa já corrigida
    // Juros = multa corrigida × (fator - 1)
    const interest = correctedFine * (fatorSelic - 1);
    
    // 5. Valor final da multa = correção monetária + juros de mora
    const finalFineValue = correctedFine + interest;
    
    // 6. Corrige o valor original pela SELIC (mesmo fator)
    const correctedOriginalValue = originalFineNum * fatorSelic;
    const originalValueCorrection = correctedOriginalValue - originalFineNum;
    
    // 7. Valor total = valor original corrigido + multa final (corrigida + juros)
    const totalValue = correctedOriginalValue + finalFineValue;
    
    // Valores para exibição
    const totalIncrease = finalFineValue - fineValue;
    const correctionIndex = fatorSelic;
    const correctionPercentage = (fatorSelic - 1) * 100;

    return NextResponse.json({
      originalValue: originalFineNum,
      finePercentage: finePercentageNum,
      fineValue: fineValue,
      correctedFine: correctedFine,
      monetaryCorrection: monetaryCorrection,
      interestFactor: fatorSelic,
      interest: interest,
      finalFineValue: finalFineValue,
      totalIncrease: totalIncrease,
      correctionIndex: correctionIndex,
      correctionPercentage: correctionPercentage,
      correctedOriginalValue: correctedOriginalValue,
      originalValueCorrection: originalValueCorrection,
      totalValue: totalValue,
      periods: selicRecords.length,
      rates: selicRecords,
      originalStartDate: correctionStartDate,
      adjustedStartDate: adjustedStartDate.dataAjustada,
      startDateWasAdjusted: adjustedStartDate.foiAjustada,
      originalEndDate: finalDate,
      adjustedEndDate: adjustedFinalDate.dataAjustada,
      endDateWasAdjusted: adjustedFinalDate.foiAjustada
    });

  } catch (error) {
    console.error('Erro ao calcular correção de multa:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao calcular correção de multa';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
