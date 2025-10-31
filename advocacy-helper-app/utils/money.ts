import Decimal from 'decimal.js';

// Configuração global do Decimal.js para cálculos monetários
Decimal.config({
  precision: 20,                    // Precisão de 20 dígitos
  rounding: Decimal.ROUND_HALF_UP, // Arredondamento padrão brasileiro
  toExpNeg: -7,                    // Evita notação científica
  toExpPos: 21,
  minE: -324,
  maxE: 308
});

/**
 * Utilitário para cálculos monetários seguros
 * Solução usando Decimal.js para máxima precisão
 */

/**
 * Classe Money - Usa Decimal.js internamente para precisão arbitrária
 * Elimina completamente erros de ponto flutuante
 */
export class Money {
  private value: any; // Usa any para evitar problemas de tipo com Decimal

  constructor(value: string | number | any) {
    if (value && typeof value === 'object' && value.constructor === Decimal) {
      this.value = value;
    } else if (typeof value === 'string') {
      // Remove caracteres não numéricos exceto . e ,
      const cleaned = value.replace(/[^\d.,-]/g, '');
      const normalized = cleaned.replace(',', '.');
      this.value = new Decimal(normalized);
    } else {
      this.value = new Decimal(value);
    }
  }

  // Operações básicas
  add(other: Money | string | number): Money {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.add(otherValue));
  }

  subtract(other: Money | string | number): Money {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return new Money(this.value.sub(otherValue));
  }

  multiply(factor: string | number | Money | any): Money {
    let factorValue;
    if (factor instanceof Money) {
      factorValue = factor.value;
    } else if (factor && typeof factor === 'object' && factor.constructor === Decimal) {
      factorValue = factor;
    } else {
      factorValue = new Decimal(factor);
    }
    return new Money(this.value.mul(factorValue));
  }

  divide(divisor: string | number | Money | any): Money {
    let divisorValue;
    if (divisor instanceof Money) {
      divisorValue = divisor.value;
    } else if (divisor && typeof divisor === 'object' && divisor.constructor === Decimal) {
      divisorValue = divisor;
    } else {
      divisorValue = new Decimal(divisor);
    }
    return new Money(this.value.div(divisorValue));
  }

  // Operações avançadas
  pow(exponent: string | number): Money {
    return new Money(this.value.pow(new Decimal(exponent)));
  }

  sqrt(): Money {
    return new Money(this.value.sqrt());
  }

  abs(): Money {
    return new Money(this.value.abs());
  }

  // Comparações
  equals(other: Money | string | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return this.value.equals(otherValue);
  }

  greaterThan(other: Money | string | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return this.value.greaterThan(otherValue);
  }

  lessThan(other: Money | string | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return this.value.lessThan(otherValue);
  }

  greaterThanOrEqualTo(other: Money | string | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return this.value.greaterThanOrEqualTo(otherValue);
  }

  lessThanOrEqualTo(other: Money | string | number): boolean {
    const otherValue = other instanceof Money ? other.value : new Decimal(other);
    return this.value.lessThanOrEqualTo(otherValue);
  }

  // Conversões
  toNumber(): number {
    return this.value.toNumber();
  }

  toString(): string {
    return this.value.toFixed(2);
  }

  toExactString(): string {
    return this.value.toString();
  }

  toFixed(decimals: number = 2): string {
    return this.value.toFixed(decimals);
  }

  // Formatação brasileira
  toBRL(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.toNumber());
  }

  // Para exportação (formato numérico brasileiro)
  toBRNumber(): string {
    return this.toFixed(2).replace('.', ',');
  }

  // Acesso ao valor Decimal interno (para casos avançados)
  getDecimal(): any {
    return this.value;
  }

  // Métodos estáticos utilitários
  static fromBRL(value: string): Money {
    // Remove R$, espaços e converte vírgula para ponto
    const cleanValue = value
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')  // Remove separadores de milhar
      .replace(',', '.');  // Converte vírgula decimal para ponto
    return new Money(cleanValue);
  }

  static zero(): Money {
    return new Money(0);
  }

  static one(): Money {
    return new Money(1);
  }

  static max(a: Money, b: Money): Money {
    return a.greaterThan(b) ? a : b;
  }

  static min(a: Money, b: Money): Money {
    return a.lessThan(b) ? a : b;
  }

  // Operações de array
  static sum(values: Money[]): Money {
    return values.reduce((acc, val) => acc.add(val), Money.zero());
  }

  static average(values: Money[]): Money {
    if (values.length === 0) return Money.zero();
    return Money.sum(values).divide(values.length);
  }
}

/**
 * Funções utilitárias para cálculos SELIC seguros usando Decimal.js
 */
export class SelicCalculator {
  /**
   * Calcula o fator SELIC acumulado de forma segura usando Decimal.js
   * Método: Acumulação simples (soma dos percentuais)
   */
  static calculateSelicFactor(rates: Array<{ data: string; valor: string }>): Money {
    let accumulatedPercentage = Money.zero();

    console.log(`📊 SelicCalculator (Decimal.js): Calculando fator com ${rates.length} taxas`);

    for (const rate of rates) {
      const monthlyRate = new Money(rate.valor).divide(100); // Converte % para decimal
      accumulatedPercentage = accumulatedPercentage.add(monthlyRate);
      
      console.log(`✓ ${rate.data}: ${rate.valor}% (acumulado: ${accumulatedPercentage.multiply(100).toFixed(6)}%)`);
    }

    // Fator = 1 + percentual acumulado
    const factor = Money.one().add(accumulatedPercentage);
    
    console.log(`📈 Fator SELIC final: ${factor.toFixed(8)}`);
    console.log(`📈 Percentual acumulado: ${accumulatedPercentage.multiply(100).toFixed(6)}%`);

    return factor;
  }

  /**
   * Calcula fator SELIC composto (multiplicação dos fatores)
   * Método alternativo para comparação
   */
  static calculateCompoundSelicFactor(rates: Array<{ data: string; valor: string }>): Money {
    let factor = Money.one();

    console.log(`📊 SelicCalculator Composto (Decimal.js): ${rates.length} taxas`);

    for (const rate of rates) {
      const monthlyRate = new Money(rate.valor).divide(100);
      const monthlyFactor = Money.one().add(monthlyRate);
      factor = factor.multiply(monthlyFactor);
      
      console.log(`✓ ${rate.data}: ${rate.valor}% (fator acumulado: ${factor.toFixed(8)})`);
    }

    console.log(`📈 Fator SELIC composto: ${factor.toFixed(8)}`);
    return factor;
  }

  /**
   * Aplica correção SELIC a um valor com máxima precisão
   */
  static applySelicCorrection(originalValue: Money, selicFactor: Money): {
    correctedValue: Money;
    correction: Money;
    percentage: Money;
  } {
    const correctedValue = originalValue.multiply(selicFactor);
    const correction = correctedValue.subtract(originalValue);
    const percentage = selicFactor.subtract(1).multiply(100);

    console.log(`💰 Correção SELIC aplicada:`);
    console.log(`   Valor original: ${originalValue.toBRL()}`);
    console.log(`   Fator SELIC: ${selicFactor.toFixed(8)}`);
    console.log(`   Valor corrigido: ${correctedValue.toBRL()}`);
    console.log(`   Correção: ${correction.toBRL()}`);
    console.log(`   Percentual: ${percentage.toFixed(6)}%`);

    return {
      correctedValue,
      correction,
      percentage
    };
  }

  /**
   * Calcula multa sobre valor já corrigido com precisão total
   */
  static calculateFine(correctedValue: Money, finePercentage: number | string): {
    fineValue: Money;
    totalValue: Money;
  } {
    const percentageMoney = new Money(finePercentage).divide(100);
    const fineValue = correctedValue.multiply(percentageMoney);
    const totalValue = correctedValue.add(fineValue);

    console.log(`🚨 Multa calculada:`);
    console.log(`   Valor base (corrigido): ${correctedValue.toBRL()}`);
    console.log(`   Percentual multa: ${finePercentage}%`);
    console.log(`   Valor da multa: ${fineValue.toBRL()}`);
    console.log(`   Valor total: ${totalValue.toBRL()}`);

    return {
      fineValue,
      totalValue
    };
  }

  /**
   * Calcula juros compostos com Decimal.js
   */
  static compoundInterest(
    principal: Money, 
    rate: Money, 
    periods: number
  ): Money {
    const onePlusRate = Money.one().add(rate);
    const factor = onePlusRate.pow(periods);
    return principal.multiply(factor);
  }
}