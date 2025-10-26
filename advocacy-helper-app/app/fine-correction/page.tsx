'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type FineResult = {
  originalValue: number;
  finePercentage: number;
  fineValue: number;
  correctedFine: number;
  monetaryCorrection: number;
  interestFactor: number;
  interest: number;
  finalFineValue: number;
  totalIncrease: number;
  correctionIndex: number;
  correctionPercentage: number;
  correctedOriginalValue: number;
  originalValueCorrection: number;
  totalValue: number;
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

export default function FineCorrection() {
  const [originalValue, setOriginalValue] = useState('');
  const [finePercentage, setFinePercentage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [calculationType, setCalculationType] = useState<'monthly' | 'daily'>('monthly');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FineResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/fine-correction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalFineValue: originalValue,
          correctionStartDate: startDate,
          finalDate: endDate,
          finePercentage: finePercentage,
          calculationType: calculationType === 'daily' ? 'diaria' : 'mensal',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao calcular');
      }

      setResult({
        ...data,
        calculationType: calculationType,
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
        <div className="mb-6">
          <Link 
            href="/" 
            className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-2"
          >
            ← Voltar para página inicial
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-2">Correção de Multa Punitiva</h1>
        <p className="text-sm text-gray-400 mb-8">
          Calcule a correção monetária e juros de mora sobre multas
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="originalValue" className="block text-sm font-medium mb-2">
                Valor Original (R$)
              </label>
              <input
                type="number"
                id="originalValue"
                value={originalValue}
                onChange={(e) => setOriginalValue(e.target.value)}
                step="0.01"
                min="0"
                required
                placeholder="10000.00"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="finePercentage" className="block text-sm font-medium mb-2">
                Percentual da Multa (%)
              </label>
              <input
                type="number"
                id="finePercentage"
                value={finePercentage}
                onChange={(e) => setFinePercentage(e.target.value)}
                step="0.01"
                min="0"
                max="100"
                required
                placeholder="10"
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                Data Inicial (Lançamento/Fato Gerador)
              </label>
              <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                Data Final (Atualização)
              </label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Tipo de Cálculo
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCalculationType('monthly')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  calculationType === 'monthly'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Taxa Mensal
              </button>
              <button
                type="button"
                onClick={() => setCalculationType('daily')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  calculationType === 'daily'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Taxa Diária
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-medium transition-colors"
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
            <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-3">Dados Informados</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400">Valor original:</span>{' '}
                  <span className="font-medium">{formatCurrency(result.originalValue)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Percentual da multa:</span>{' '}
                  <span className="font-medium">{result.finePercentage}%</span>
                </div>
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
            <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold mb-3">Resumo do Cálculo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <span className="text-gray-400">Índice de correção:</span>{' '}
                  <span className="font-medium">{result.correctionIndex.toFixed(8)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Percentual de correção:</span>{' '}
                  <span className="font-medium">{result.correctionPercentage.toFixed(6)} %</span>
                </div>
                <div>
                  <span className="text-gray-400">Fator de juros:</span>{' '}
                  <span className="font-medium">{result.interestFactor.toFixed(8)}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="text-sm text-gray-400 mb-1">Valor da Multa</h3>
                <p className="text-xl font-bold">{formatCurrency(result.fineValue)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {result.finePercentage}% de {formatCurrency(result.originalValue)}
                </p>
              </div>

              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <h3 className="text-sm text-gray-400 mb-2">Correção Monetária e Juros</h3>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-500">Correção Monetária</p>
                    <p className="text-lg font-bold text-blue-400">
                      {formatCurrency(result.monetaryCorrection)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Juros de Mora</p>
                    <p className="text-lg font-bold text-yellow-400">
                      {formatCurrency(result.interest)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-purple-900/30 rounded-lg border border-purple-700">
                <h3 className="text-sm text-gray-400 mb-1">Valor Original Corrigido</h3>
                <p className="text-xl font-bold text-purple-400">
                  {formatCurrency(result.correctedOriginalValue)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Correção: +{formatCurrency(result.originalValueCorrection)}
                </p>
              </div>

              <div className="p-6 bg-green-900/30 rounded-lg border border-green-700">
                <h3 className="text-sm text-gray-400 mb-1">Valor Final da Multa</h3>
                <p className="text-2xl font-bold text-green-400 mb-3">
                  {formatCurrency(result.finalFineValue)}
                </p>
                <div className="space-y-1 text-xs text-gray-400 border-t border-gray-700 pt-3">
                  <div className="flex justify-between">
                    <span>Multa base:</span>
                    <span className="text-gray-300">{formatCurrency(result.fineValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correção SELIC:</span>
                    <span className="text-blue-400">+{formatCurrency(result.monetaryCorrection)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Juros de mora:</span>
                    <span className="text-yellow-400">+{formatCurrency(result.interest)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-sm pt-2 border-t border-gray-700 mt-2">
                    <span className="text-gray-300">Total acrescido:</span>
                    <span className="text-green-400">+{formatCurrency(result.totalIncrease)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-red-900/30 rounded-lg border border-red-700">
              <h3 className="text-sm text-gray-400 mb-1">Valor Total</h3>
              <p className="text-3xl font-bold text-red-400 mb-3">
                {formatCurrency(result.totalValue)}
              </p>
              <div className="space-y-1 text-xs text-gray-400 border-t border-red-700/50 pt-3">
                <div className="flex justify-between">
                  <span>Valor original corrigido:</span>
                  <span className="text-gray-300">{formatCurrency(result.correctedOriginalValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Multa final corrigida:</span>
                  <span className="text-gray-300">+{formatCurrency(result.finalFineValue)}</span>
                </div>
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
                    {result.rates.map((rate, index) => (
                      <tr key={index} className="border-b border-gray-700/50">
                        <td className="py-2 px-2">{formatDate(rate.data)}</td>
                        <td className="text-right py-2 px-2">{rate.valor}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-12 pt-8 border-t border-gray-700">
          <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Desenvolvido por Pedro Leale</span>
              <a
                href="https://github.com/PedroLeale/advocacy-helper"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                aria-label="GitHub Repository"
              >
                <Image
                  src="/github_icon.png"
                  alt="GitHub"
                  width={20}
                  height={20}
                  className="dark:invert"
                />
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
