import { NextRequest, NextResponse } from 'next/server';
import { fetchSelicSerie, calcularFatorSelic, ajustarParaDiaUtil } from '@/utils/selic';

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

    // Série 4390 = Taxa SELIC acumulada no mês (% ao mês)
    // Série 11 = Taxa SELIC diária (% ao dia)
    const serieCodigo = tipoCalculo === 'mensal' ? 4390 : 11;
    
    const ajusteInicial = await ajustarParaDiaUtil(dataInicial, serieCodigo);
    const ajusteFinal = await ajustarParaDiaUtil(dataFinal, serieCodigo);
    
    console.log('Data inicial original:', dataInicial, '-> ajustada:', ajusteInicial.dataAjustada, 'foi ajustada?', ajusteInicial.foiAjustada);
    console.log('Data final original:', dataFinal, '-> ajustada:', ajusteFinal.dataAjustada, 'foi ajustada?', ajusteFinal.foiAjustada);
    const dataFinalParaCalculo = new Date(ajusteFinal.dataAjustada);
    dataFinalParaCalculo.setDate(dataFinalParaCalculo.getDate() - 1);
    const dataFinalCalculoISO = dataFinalParaCalculo.toISOString().split('T')[0];
    
    console.log('Data final para cálculo (dia anterior):', dataFinalCalculoISO);

    const selicRecords = await fetchSelicSerie(
      serieCodigo,
      ajusteInicial.dataAjustada,
      dataFinalCalculoISO
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

    const valorInicialNum = parseFloat(valorInicial);
    
    const isMonthly = tipoCalculo === 'mensal';
    const valorCorrigido = calcularFatorSelic(selicRecords, valorInicialNum, false, false, isMonthly);
    const valorJuros = valorCorrigido - valorInicialNum;
    const indiceCorrecao = valorCorrigido / valorInicialNum;
    const percentualCorrecao = (indiceCorrecao - 1) * 100;

    return NextResponse.json({
      valorInicial: valorInicialNum,
      valorCorrigido,
      valorJuros,
      indiceCorrecao,
      percentualCorrecao,
      periodos: selicRecords.length,
      taxas: selicRecords,
      dataInicialOriginal: dataInicial,
      dataInicialAjustada: ajusteInicial.dataAjustada,
      dataInicialFoiAjustada: ajusteInicial.foiAjustada,
      dataFinalOriginal: dataFinal,
      dataFinalAjustada: ajusteFinal.dataAjustada,
      dataFinalFoiAjustada: ajusteFinal.foiAjustada
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
