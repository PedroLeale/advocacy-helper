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

    // Série 4390 = Taxa SELIC acumulada no mês (% ao mês)
    // Série 11 = Taxa SELIC diária (% ao dia)
    const serieCodigo = calculationType === 'mensal' ? 4390 : 11;
    
    // Ajusta datas para dias úteis
    const adjustedStartDate = await ajustarParaDiaUtil(correctionStartDate, serieCodigo);
    const adjustedFinalDate = await ajustarParaDiaUtil(finalDate, serieCodigo);
    
    console.log('Data inicial original:', correctionStartDate, '-> ajustada:', adjustedStartDate.dataAjustada);
    console.log('Data final original:', finalDate, '-> ajustada:', adjustedFinalDate.dataAjustada);
    
    // Para o cálculo, vamos até o dia ANTERIOR ao dia final
    const finalDateForCalculation = new Date(adjustedFinalDate.dataAjustada);
    finalDateForCalculation.setDate(finalDateForCalculation.getDate() - 1);
    const finalDateCalculationISO = finalDateForCalculation.toISOString().split('T')[0];
    
    console.log('Data final para cálculo (dia anterior):', finalDateCalculationISO);
    
    // Busca os dados da API do Banco Central
    const selicRecords = await fetchSelicSerie(
      serieCodigo,
      adjustedStartDate.dataAjustada,
      finalDateCalculationISO
    );

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
    
    // Determina se é taxa mensal
    const isMonthly = calculationType === 'mensal';
    
    // 2. Corrige a multa pela SELIC
    const correctedFine = calcularFatorSelic(selicRecords, fineValue, false, false, isMonthly);
    
    // 3. Calcula o fator de juros de mora (mesmo fator SELIC acumulado)
    const interestFactor = calcularFatorSelic(selicRecords, 1, false, false, isMonthly);
    
    // 4. Aplica juros sobre a multa corrigida
    const finalFineValue = correctedFine * interestFactor;
    
    // 5. Corrige o valor original pela SELIC
    const correctedOriginalValue = calcularFatorSelic(selicRecords, originalFineNum, false, false, isMonthly);
    
    // 6. Valor total = valor original corrigido + multa final corrigida
    const totalValue = correctedOriginalValue + finalFineValue;
    
    // Calcula valores individuais
    const monetaryCorrection = correctedFine - fineValue;
    const interest = finalFineValue - correctedFine;
    const totalIncrease = finalFineValue - fineValue;
    const originalValueCorrection = correctedOriginalValue - originalFineNum;
    
    const correctionIndex = finalFineValue / fineValue;
    const correctionPercentage = (correctionIndex - 1) * 100;

    return NextResponse.json({
      originalValue: originalFineNum,
      finePercentage: finePercentageNum,
      fineValue: fineValue,
      correctedFine: correctedFine,
      monetaryCorrection: monetaryCorrection,
      interestFactor: interestFactor,
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
      // Informações sobre ajustes de data
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
