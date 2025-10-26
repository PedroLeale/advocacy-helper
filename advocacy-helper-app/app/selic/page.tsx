'use client';

import { useState } from 'react';

type SelicResult = {
  initialValue: number;
  correctedValue: number;
  interestValue: number;
  correctionIndex: number;
  correctionPercentage: number;
  periods: number;
  rates: Array<{ data: string; valor: string }>;
  calculationType: 'monthly' | 'daily';
  originalStartDate: string;
  adjustedStartDate: string;
  startDateWasAdjusted: boolean;
  originalEndDate: string;
  adjustedEndDate: string;
  endDateWasAdjusted: boolean;
};

export default function SelicCalculator() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [initialValue, setInitialValue] = useState('');
  const [calculationType, setCalculationType] = useState<'monthly' | 'daily'>('daily');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SelicResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/selic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dataInicial: startDate,
          dataFinal: endDate,
          valorInicial: initialValue,
          tipoCalculo: calculationType === 'daily' ? 'diaria' : 'mensal',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao calcular');
      }

      // Map API response to English property names
      setResult({
        initialValue: data.valorInicial,
        correctedValue: data.valorCorrigido,
        interestValue: data.valorJuros,
        correctionIndex: data.indiceCorrecao,
        correctionPercentage: data.percentualCorrecao,
        periods: data.periodos,
        rates: data.taxas,
        calculationType: calculationType,
        originalStartDate: data.dataInicialOriginal,
        adjustedStartDate: data.dataInicialAjustada,
        startDateWasAdjusted: data.dataInicialFoiAjustada,
        originalEndDate: data.dataFinalOriginal,
        adjustedEndDate: data.dataFinalAjustada,
        endDateWasAdjusted: data.dataFinalFoiAjustada,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const [day, month, year] = dateString.split('/');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Calculadora de Correção SELIC</h1>
        <p className="text-sm text-gray-400 mb-8">
          Calcule a correção monetária pela taxa SELIC com opção de cálculo mensal ou diário
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                Data Final
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="initialValue" className="block text-sm font-medium mb-2">
              Valor Inicial (R$)
            </label>
            <input
              type="number"
              id="initialValue"
              value={initialValue}
              onChange={(e) => setInitialValue(e.target.value)}
              step="0.01"
              min="0"
              required
              placeholder="1000.00"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Tipo de Cálculo
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCalculationType('daily')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  calculationType === 'daily'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Taxa Diária
              </button>
              <button
                type="button"
                onClick={() => setCalculationType('monthly')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  calculationType === 'monthly'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Taxa Mensal
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Calculando...' : 'Calcular Correção'}
          </button>
        </form>

        {error && (
          <div className="p-4 mb-6 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Resumo dos Dados Informados */}
            <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-3">Dados Informados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Data inicial:</span>{' '}
                  <span className="font-medium">
                    {result.adjustedStartDate.split('-').reverse().join('/')}
                    {result.startDateWasAdjusted && '*'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Data final:</span>{' '}
                  <span className="font-medium">
                    {result.adjustedEndDate.split('-').reverse().join('/')}
                    {result.endDateWasAdjusted && '*'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Valor nominal:</span>{' '}
                  <span className="font-medium">{formatCurrency(result.initialValue)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Tipo de cálculo:</span>{' '}
                  <span className="font-medium">{result.calculationType === 'monthly' ? 'Mensal' : 'Diário'}</span>
                </div>
              </div>
              {(result.startDateWasAdjusted || result.endDateWasAdjusted) && (
                <p className="text-xs text-yellow-400 mt-3">
                  * A data informada não é dia útil, a data utilizada para este cálculo refere-se ao primeiro dia útil subsequente
                </p>
              )}
            </div>

            {/* Dados Calculados */}
            <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-3">Dados Calculados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <span className="text-gray-400">Índice de correção no período:</span>{' '}
                  <span className="font-medium">{result.correctionIndex.toFixed(8)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Valor percentual correspondente:</span>{' '}
                  <span className="font-medium">{result.correctionPercentage.toFixed(6)} %</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="text-sm text-gray-400 mb-1">Valor Inicial</h3>
                <p className="text-2xl font-bold">{formatCurrency(result.initialValue)}</p>
              </div>

              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="text-sm text-gray-400 mb-1">Juros SELIC</h3>
                <p className="text-2xl font-bold text-green-400">
                  {formatCurrency(result.interestValue)}
                </p>
              </div>

              <div className="p-6 bg-blue-900/30 rounded-lg border border-blue-700">
                <h3 className="text-sm text-gray-400 mb-1">Valor Corrigido</h3>
                <p className="text-2xl font-bold text-blue-400">
                  {formatCurrency(result.correctedValue)}
                </p>
              </div>
            </div>

            <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-4">
                Detalhes do Período ({result.periods} {result.calculationType === 'monthly' 
                  ? (result.periods === 1 ? 'mês' : 'meses')
                  : (result.periods === 1 ? 'dia' : 'dias')
                })
              </h3>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-800">
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2 px-2">
                        {result.calculationType === 'monthly' ? 'Mês' : 'Data'}
                      </th>
                      <th className="text-right py-2 px-2">
                        Taxa SELIC {result.calculationType === 'monthly' ? 'Mensal' : 'Diária'} (%)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rates.map((taxa, index) => (
                      <tr key={index} className="border-b border-gray-700/50">
                        <td className="py-2 px-2">{formatDate(taxa.data)}</td>
                        <td className="text-right py-2 px-2">{taxa.valor}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
