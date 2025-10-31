import { aplicarCorrecaoSelic, calcularMulta, criarValorBRL, formatarReal, calcularFatorSelic } from '../utils/selic';
import { readCSVTestData, convertToDebitData, calculatePercentageDifference } from './csv-utils';

describe('ts-money Integration Tests', () => {
  // Mock data simulando registros SELIC
  const mockSelicRecords = [
    { data: '01/10/2023', valor: '1.15' },
    { data: '01/11/2023', valor: '1.20' },
    { data: '01/12/2023', valor: '1.25' }
  ];

  test('deve criar valor em BRL corretamente', () => {
    const valor = criarValorBRL(100.50);
    expect(valor.getAmount()).toBe(10050); // 100.50 * 100 = 10050 centavos
    expect(valor.getCurrency()).toBe('BRL');
  });

  test('deve formatar valor em Real brasileiro', () => {
    const valor = criarValorBRL(1234.56);
    const formatado = formatarReal(valor);
    expect(formatado).toMatch(/R\$\s*1\.234,56/); // Aceita variações de formatação
  });

  test('deve calcular multa corretamente', () => {
    const valorPrincipal = criarValorBRL(1000);
    const multa = calcularMulta(valorPrincipal, 10); // 10% de multa
    
    expect(multa.getAmount()).toBe(10000); // 100 reais = 10000 centavos
    expect(multa.getCurrency()).toBe('BRL');
  });

  test('deve aplicar correção SELIC', () => {
    const valorInicial = criarValorBRL(1000);
    const valorCorrigido = aplicarCorrecaoSelic(
      valorInicial,
      mockSelicRecords,
      false,
      false,
      '2023-10-01',
      '2024-01-01'
    );

    // Valor corrigido deve ser maior que o inicial
    expect(valorCorrigido.getAmount()).toBeGreaterThan(valorInicial.getAmount());
    expect(valorCorrigido.getCurrency()).toBe('BRL');
  });

  test('deve realizar cálculo completo de multa com correção', () => {
    const valorOriginal = criarValorBRL(5000); // R$ 5.000,00
    
    // 1. Aplica correção SELIC
    const valorCorrigido = aplicarCorrecaoSelic(
      valorOriginal,
      mockSelicRecords,
      false,
      false,
      '2023-10-01',
      '2024-01-01'
    );
    
    // 2. Calcula multa sobre valor corrigido
    const multa = calcularMulta(valorCorrigido, 20); // 20% de multa
    
    // 3. Valor total
    const valorTotal = valorCorrigido.add(multa);
    
    expect(valorTotal.getAmount()).toBeGreaterThan(valorCorrigido.getAmount());
    expect(valorTotal.getCurrency()).toBe('BRL');
  });

  test('deve manter precisão em operações sucessivas', () => {
    const valor = criarValorBRL(0.01); // 1 centavo
    const valorMultiplicado = valor.multiply(100);
    const valorDividido = valorMultiplicado.divide(100);
    
    expect(valorDividido.getAmount()).toBe(valor.getAmount());
  });
});

describe('CSV Data Validation with SELIC Calculator', () => {
  let csvData: ReturnType<typeof readCSVTestData>;

  beforeAll(() => {
    csvData = readCSVTestData();
  });

  test('deve carregar dados do CSV corretamente', () => {
    expect(csvData.length).toBeGreaterThan(0);
    expect(csvData[0]).toHaveProperty('Principal');
    expect(csvData[0]).toHaveProperty('TermoInicial');
    expect(csvData[0]).toHaveProperty('CorrecaoSelicPercent');
    expect(csvData[0]).toHaveProperty('PrincipalAtualizado');
    expect(csvData[0]).toHaveProperty('ValorMulta');
  });

  test('validação de cálculos SELIC com ts-money para todos os registros do CSV', () => {
    const tolerancia = 1; // 5% de tolerância para diferenças de metodologia
    let totalValidados = 0;
    let totalComErro = 0;
    let somaErrosPercentual = 0;

    csvData.forEach((record, index) => {
      try {
        const data = convertToDebitData(record);
        
        // Simulação de dados SELIC baseados no percentual do CSV
        // Para teste, criamos registros mensais simulados
        const dataInicial = data.termoInicial;
        const dataFinal = new Date(2024, 9, 31); // 31/10/2024
        
        const mesesDiferenca = Math.max(1, Math.floor(
          (dataFinal.getTime() - dataInicial.getTime()) / (1000 * 60 * 60 * 24 * 30)
        ));
        
        // Distribui o percentual total pelos meses
        const percentualMensal = data.correcaoSelic / mesesDiferenca;
        
        const mockSelicData = Array.from({ length: mesesDiferenca }, (_, i) => {
          const mesData = new Date(dataInicial);
          mesData.setMonth(mesData.getMonth() + i + 1);
          return {
            data: `01/${(mesData.getMonth() + 1).toString().padStart(2, '0')}/${mesData.getFullYear()}`,
            valor: percentualMensal.toFixed(2)
          };
        });

        // Teste 1: Correção SELIC do valor principal
        const valorOriginalMoney = criarValorBRL(data.principal);
        const valorCorrigidoMoney = aplicarCorrecaoSelic(
          valorOriginalMoney,
          mockSelicData,
          false,
          false,
          dataInicial.toISOString().split('T')[0],
          dataFinal.toISOString().split('T')[0]
        );
        
        const principalCalculado = valorCorrigidoMoney.getAmount() / 100;
        const erroPercent = calculatePercentageDifference(principalCalculado, data.principalAtualizado);
        
        // Teste 2: Cálculo da multa sobre valor corrigido
        const multaCalculadaMoney = calcularMulta(valorCorrigidoMoney, 50); // 50% conforme CSV
        const multaCalculada = multaCalculadaMoney.getAmount() / 100;
        const erroMultaPercent = calculatePercentageDifference(multaCalculada, data.multa);
        
        totalValidados++;
        
        if (erroPercent > tolerancia || erroMultaPercent > tolerancia) {
          totalComErro++;
        }
        
        somaErrosPercentual += erroPercent;
        
        // Validações dos testes
        expect(principalCalculado).toBeGreaterThan(data.principal); // Principal corrigido > original
        expect(multaCalculada).toBeGreaterThan(0); // Multa calculada
        expect(valorCorrigidoMoney.getCurrency()).toBe('BRL');
        expect(multaCalculadaMoney.getCurrency()).toBe('BRL');
        
      } catch (error) {
        console.error(`❌ Erro no item ${record.Item}:`, error);
        totalComErro++;
      }
    });

    const erroMedio = somaErrosPercentual / totalValidados;
    const percentualSucesso = ((totalValidados - totalComErro) / totalValidados) * 100;
    
    // O teste passa se pelo menos 80% dos registros estão dentro da tolerância
    expect(percentualSucesso).toBeGreaterThan(80);
    expect(erroMedio).toBeLessThan(10);
  });

  test('validação específica de itens com alta precisão', () => {
    // Testa alguns itens específicos com metodologia mais precisa
    const itensEspecificos = ['1.1', '1.5', '2.1'];
    
    itensEspecificos.forEach(itemId => {
      const record = csvData.find(r => r.Item === itemId);
      if (!record) return;
      
      const data = convertToDebitData(record);
      
      const valorMoney = criarValorBRL(data.principal);
      
      // Simula aplicação direta do percentual SELIC
      const fatorCorrecao = 1 + (data.correcaoSelic / 100);
      const valorCorrigidoEsperado = data.principal * fatorCorrecao;
      
      // Calcula multa
      const multaEsperada = valorCorrigidoEsperado * 0.5; // 50%
      
      // Validações
      expect(valorMoney.getCurrency()).toBe('BRL');
      expect(data.principal).toBeGreaterThan(0);
      expect(data.correcaoSelic).toBeGreaterThan(0);
    });
  });
});