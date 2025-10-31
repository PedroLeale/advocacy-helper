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

    // Série 4390 = Taxa SELIC acumulada no mês (% ao mês) - sempre mensal
    const serieCodigo = 4390;
    
    const ajusteInicial = await ajustarParaDiaUtil(dataInicial, serieCodigo);
    const ajusteFinal = await ajustarParaDiaUtil(dataFinal, serieCodigo);
    
    console.log('Data inicial original:', dataInicial, '-> ajustada:', ajusteInicial.dataAjustada, 'foi ajustada?', ajusteInicial.foiAjustada);
    console.log('Data final original:', dataFinal, '-> ajustada:', ajusteFinal.dataAjustada, 'foi ajustada?', ajusteFinal.foiAjustada);
    
    // Sempre é taxa mensal
    const isMonthly = true;
    
    // Lógica MENSAL: busca dados de dataInicial+1mês até dataFinal-1mês
    // e adiciona o último mês com 1% fixo na função calcularFatorSelic
    const dataInicialOriginal = ajusteInicial.dataAjustada;
    const dataFinalOriginal = ajusteFinal.dataAjustada;
    
    // Adiciona 1 mês à data inicial
    const [year, month, day] = ajusteInicial.dataAjustada.split('-').map(Number);
    const dataInicialMais1Mes = new Date(year, month - 1 + 1, day); // month-1 porque Date usa 0-based
    const dataInicialParaBusca = dataInicialMais1Mes.toISOString().split('T')[0];
    
    // Subtrai 1 mês da data final
    const [yearF, monthF, dayF] = ajusteFinal.dataAjustada.split('-').map(Number);
    const dataFinalMenos1Mes = new Date(yearF, monthF - 1 - 1, dayF); // month-1 porque Date usa 0-based
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

    const valorInicialNum = parseFloat(valorInicial);
    
    const valorCorrigido = calcularFatorSelic(selicRecords, valorInicialNum, false, false, true, dataInicialOriginal, dataFinalOriginal);
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
      dataInicialAjustada: dataInicialParaBusca,
      dataInicialFoiAjustada: true, // Para mensal, sempre foi "ajustada" (+1 mês)
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
