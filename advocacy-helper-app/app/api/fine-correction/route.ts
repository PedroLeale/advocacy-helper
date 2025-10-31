import { NextRequest, NextResponse } from 'next/server';
import { fetchSelicSerie, calcularFatorSelic, ajustarParaDiaUtil } from '@/utils/selic';
import { Money, SelicCalculator } from '@/utils/money';

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

    // Validação de datas
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Final do dia atual
    
    if (new Date(correctionStartDate) >= new Date(finalDate)) {
      return NextResponse.json(
        { error: 'A data final deve ser posterior à data inicial.' },
        { status: 400 }
      );
    }

    if (new Date(correctionStartDate) > today) {
      return NextResponse.json(
        { error: 'A data inicial não pode ser uma data futura.' },
        { status: 400 }
      );
    }

    if (new Date(finalDate) > today) {
      return NextResponse.json(
        { error: 'A data final não pode ser uma data futura.' },
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

    // NOVA METODOLOGIA COM MONEY CLASS: Corrige primeiro o valor principal, depois aplica a multa
    const originalFineMoney = new Money(originalFineValue);
    const finePercentageMoney = new Money(finePercentage);
    
    // 1. Calcula o FATOR SELIC acumulado (usando valor base 1 para obter apenas o fator)
    const fatorSelicNum = calcularFatorSelic(selicRecords, 1, false, false, true, dataInicialOriginal, dataFinalOriginal);
    const fatorSelicMoney = new Money(fatorSelicNum);
    const selicPercentageMoney = fatorSelicMoney.subtract(1).multiply(100);
    
    console.log(`📊 NOVA METODOLOGIA DE MULTA (Money Class):`);
    console.log(`   Valor original: ${originalFineMoney.toBRL()}`);
    console.log(`   SELIC acumulada: ${selicPercentageMoney.toFixed(2)}%`);
    console.log(`   Fator SELIC: ${fatorSelicMoney.toFixed(8)}`);
    
    // 2. Atualiza o valor principal pela SELIC usando Money
    const correctedOriginalValueMoney = originalFineMoney.multiply(fatorSelicMoney.toNumber());
    const originalValueCorrectionMoney = correctedOriginalValueMoney.subtract(originalFineMoney);
    
    console.log(`   Valor principal corrigido: ${correctedOriginalValueMoney.toBRL()}`);
    console.log(`   Correção do principal: ${originalValueCorrectionMoney.toBRL()}`);
    
    // 3. Aplica o percentual da multa SOBRE O VALOR JÁ CORRIGIDO usando Money
    const fineValueMoney = correctedOriginalValueMoney.multiply(finePercentageMoney.divide(100).toNumber());
    
    console.log(`   Multa ${finePercentage}% sobre valor corrigido: ${fineValueMoney.toBRL()}`);
    
    // 4. Valor final = valor principal corrigido + multa
    const totalValueMoney = correctedOriginalValueMoney.add(fineValueMoney);
    
    console.log(`   VALOR FINAL: ${totalValueMoney.toBRL()}`);
    console.log(`📋 RESUMO (Money Class):`);
    console.log(`   Principal: ${originalFineMoney.toBRL()} → ${correctedOriginalValueMoney.toBRL()} (+${selicPercentageMoney.toFixed(2)}%)`);
    console.log(`   Multa: ${fineValueMoney.toBRL()} (${finePercentage}% sobre valor corrigido)`);
    console.log(`   Total: ${totalValueMoney.toBRL()}`);
    
    // Valores para exibição usando Money
    const totalIncreaseMoney = totalValueMoney.subtract(originalFineMoney);

    return NextResponse.json({
      originalValue: originalFineMoney.toNumber(),
      finePercentage: finePercentageMoney.toNumber(),
      fineValue: fineValueMoney.toNumber(),
      correctedFine: correctedOriginalValueMoney.toNumber(), // Valor principal corrigido
      monetaryCorrection: originalValueCorrectionMoney.toNumber(), // Correção só do principal
      interestFactor: fatorSelicMoney.toNumber(),
      interest: fineValueMoney.toNumber(), // Valor da multa aplicada
      finalFineValue: totalValueMoney.toNumber(), // Valor total final
      totalIncrease: totalIncreaseMoney.toNumber(),
      correctionIndex: fatorSelicMoney.toNumber(),
      correctionPercentage: selicPercentageMoney.toNumber(),
      correctedOriginalValue: correctedOriginalValueMoney.toNumber(),
      originalValueCorrection: originalValueCorrectionMoney.toNumber(),
      totalValue: totalValueMoney.toNumber(),
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
