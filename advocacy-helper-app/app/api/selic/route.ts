import { NextRequest, NextResponse } from 'next/server';
import { fetchSelicSerie, ajustarParaDiaUtil } from '@/utils/selic';
import { Money, SelicCalculator } from '@/utils/money';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dataInicial, dataFinal, valorInicial, tipoCalculo = 'mensal' } = body;

    if (!dataInicial || !dataFinal || !valorInicial) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: dataInicial, dataFinal, valorInicial' },
        { status: 400 }
      );
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    if (new Date(dataInicial) >= new Date(dataFinal)) {
      return NextResponse.json(
        { error: 'A data final deve ser posterior à data inicial.' },
        { status: 400 }
      );
    }

    if (new Date(dataInicial) > today) {
      return NextResponse.json(
        { error: 'A data inicial não pode ser uma data futura.' },
        { status: 400 }
      );
    }

    if (new Date(dataFinal) > today) {
      return NextResponse.json(
        { error: 'A data final não pode ser uma data futura.' },
        { status: 400 }
      );
    }

    // Série 4390 = Taxa SELIC acumulada no mês (% ao mês)
    const serieCodigo = 4390;
    
    const ajusteInicial = await ajustarParaDiaUtil(dataInicial, serieCodigo);
    const ajusteFinal = await ajustarParaDiaUtil(dataFinal, serieCodigo);
    
    console.log('Data inicial original:', dataInicial, '-> ajustada:', ajusteInicial.dataAjustada, 'foi ajustada?', ajusteInicial.foiAjustada);
    console.log('Data final original:', dataFinal, '-> ajustada:', ajusteFinal.dataAjustada, 'foi ajustada?', ajusteFinal.foiAjustada);
    
    const isMonthly = true;

    const dataInicialOriginal = ajusteInicial.dataAjustada;
    const dataFinalOriginal = ajusteFinal.dataAjustada;
    
    const [year, month, day] = ajusteInicial.dataAjustada.split('-').map(Number);
    const dataInicialMais1Mes = new Date(year, month - 1 + 1, day);
    const dataInicialParaBusca = dataInicialMais1Mes.toISOString().split('T')[0];
 
    const [yearF, monthF, dayF] = ajusteFinal.dataAjustada.split('-').map(Number);
    const dataFinalMenos1Mes = new Date(yearF, monthF - 1 - 1, dayF); 
    const dataFinalParaBusca = dataFinalMenos1Mes.toISOString().split('T')[0];
    
    console.log(`📅 MENSAL - Original: ${dataInicialOriginal} a ${dataFinalOriginal}`);
    console.log(`📅 MENSAL - Busca API: ${dataInicialParaBusca} a ${dataFinalParaBusca} (último mês será adicionado como 1%)`);

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

    // 🚀 NOVA IMPLEMENTAÇÃO: Usando SelicCalculator (Decimal.js)
    const valorInicialMoney = new Money(valorInicial);
    
    // Adiciona o último mês como 1% aos registros
    const recordsComUltimoMes = [...selicRecords, { 
      data: `01/${dataFinalOriginal.split('-')[1]}/${dataFinalOriginal.split('-')[0]}`, 
      valor: '1.00' 
    }];
    
    console.log(`🚀 Usando SelicCalculator com ${recordsComUltimoMes.length} registros (incluindo último mês 1%)`);
    
    // Calcula fator SELIC usando a classe dedicada
    const fatorSelic = SelicCalculator.calculateSelicFactor(recordsComUltimoMes);
    
    // Aplica correção SELIC
    const resultado = SelicCalculator.applySelicCorrection(valorInicialMoney, fatorSelic);

    console.log(`💰 RESULTADO FINAL SELIC (SelicCalculator + Decimal.js):`);
    console.log(`   Valor inicial: ${valorInicialMoney.toBRL()}`);
    console.log(`   Valor corrigido: ${resultado.correctedValue.toBRL()}`);
    console.log(`   Valor dos juros: ${resultado.correction.toBRL()}`);
    console.log(`   Percentual: ${resultado.percentage.toFixed(6)}%`);

    return NextResponse.json({
      valorInicial: valorInicialMoney.toNumber(),
      valorCorrigido: resultado.correctedValue.toNumber(),
      valorJuros: resultado.correction.toNumber(),
      indiceCorrecao: fatorSelic.toNumber(),
      percentualCorrecao: resultado.percentage.toNumber(),
      periodos: recordsComUltimoMes.length,
      taxas: recordsComUltimoMes,
      dataInicialOriginal: dataInicial,
      dataInicialAjustada: dataInicialParaBusca,
      dataInicialFoiAjustada: true,
      dataFinalOriginal: dataFinal,
      dataFinalAjustada: ajusteFinal.dataAjustada,
      dataFinalFoiAjustada: ajusteFinal.foiAjustada,
      tipoCalculo: 'monthly'
    });

  } catch (error) {
    console.error('Erro ao calcular SELIC:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao calcular correção SELIC';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
