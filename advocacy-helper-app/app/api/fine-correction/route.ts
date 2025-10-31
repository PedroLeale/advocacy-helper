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

    // NOVA METODOLOGIA: Corrige primeiro o valor principal, depois aplica a multa
    const originalFineNum = parseFloat(originalFineValue);
    const finePercentageNum = parseFloat(finePercentage);
    
    // 1. Calcula o FATOR SELIC acumulado
    const fatorSelic = calcularFatorSelic(selicRecords, 1, false, false, true, dataInicialOriginal, dataFinalOriginal);
    const selicPercentage = (fatorSelic - 1) * 100;
    
    console.log(`📊 NOVA METODOLOGIA DE MULTA:`);
    console.log(`   Valor original: R$ ${originalFineNum.toFixed(2)}`);
    console.log(`   SELIC acumulada: ${selicPercentage.toFixed(2)}%`);
    console.log(`   Fator SELIC: ${fatorSelic.toFixed(8)}`);
    
    // 2. Atualiza o valor principal pela SELIC
    const correctedOriginalValue = originalFineNum * fatorSelic;
    const originalValueCorrection = correctedOriginalValue - originalFineNum;
    
    console.log(`   Valor principal corrigido: R$ ${correctedOriginalValue.toFixed(2)}`);
    console.log(`   Correção do principal: R$ ${originalValueCorrection.toFixed(2)}`);
    
    // 3. Aplica o percentual da multa SOBRE O VALOR JÁ CORRIGIDO
    const fineValue = correctedOriginalValue * (finePercentageNum / 100);
    
    console.log(`   Multa ${finePercentageNum}% sobre valor corrigido: R$ ${fineValue.toFixed(2)}`);
    
    // 4. Valor final = valor principal corrigido + multa
    const totalValue = correctedOriginalValue + fineValue;
    
    console.log(`   VALOR FINAL: R$ ${totalValue.toFixed(2)}`);
    console.log(`📋 RESUMO:`);
    console.log(`   Principal: R$ ${originalFineNum.toFixed(2)} → R$ ${correctedOriginalValue.toFixed(2)} (+${selicPercentage.toFixed(2)}%)`);
    console.log(`   Multa: R$ ${fineValue.toFixed(2)} (${finePercentageNum}% sobre valor corrigido)`);
    console.log(`   Total: R$ ${totalValue.toFixed(2)}`);
    
    // Valores para exibição
    const totalIncrease = totalValue - originalFineNum; // Aumento total sobre o valor original
    const correctionIndex = fatorSelic;
    const correctionPercentage = (fatorSelic - 1) * 100;

    return NextResponse.json({
      originalValue: originalFineNum,
      finePercentage: finePercentageNum,
      fineValue: fineValue,
      correctedFine: correctedOriginalValue, // Valor principal corrigido
      monetaryCorrection: originalValueCorrection, // Correção só do principal
      interestFactor: fatorSelic,
      interest: fineValue, // Valor da multa aplicada
      finalFineValue: totalValue, // Valor total final
      totalIncrease: totalIncrease,
      correctionIndex: correctionIndex,
      correctionPercentage: correctionPercentage,
      correctedOriginalValue: correctedOriginalValue,
      originalValueCorrection: originalValueCorrection,
      totalValue: totalValue,
      periods: selicRecords.length,
      rates: selicRecords,
      originalStartDate: correctionStartDate,
      adjustedStartDate: dataInicialParaBusca, // Data realmente usada no cálculo (+1 mês)
      startDateWasAdjusted: true, // Sempre ajustada para +1 mês na metodologia
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
