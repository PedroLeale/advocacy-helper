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
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FineResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    if (new Date(startDate) >= new Date(endDate)) {
      setError('A data final deve ser posterior à data inicial.');
      setLoading(false);
      return;
    }

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
          calculationType: 'mensal',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao calcular');
      }

      setResult({
        ...data,
        calculationType: 'monthly',
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

  const copyToClipboard = (value: string, element: HTMLElement) => {
    navigator.clipboard.writeText(value);
    
    const originalBg = element.style.backgroundColor;
    element.style.backgroundColor = 'rgba(34, 197, 94, 0.3)';
    element.style.transform = 'scale(1.02)';
    
    setTimeout(() => {
      element.style.backgroundColor = originalBg;
      element.style.transform = 'scale(1)';
    }, 300);
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="max-w-6xl mx-auto">
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
          Calcule a correção monetária e juros de mora sobre multas. Utilizando a taxa SELIC para atualização monetária conforme a legislação vigente.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Período do Cálculo</h3>
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
                  max={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                  Data Final (Atualização)
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || undefined}
                    max={new Date().toISOString().split('T')[0]}
                    required
                    className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => setEndDate(new Date().toISOString().split('T')[0])}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors whitespace-nowrap"
                    title="Definir como hoje"
                  >
                    Hoje
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Valores e Multa</h3>
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
                  <span className="text-gray-400">Data inicial informada:</span>{' '}
                  <span className="font-medium text-gray-300">
                    {result.originalStartDate?.split('-').reverse().join('/') || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Data inicial usada no cálculo:</span>{' '}
                  <span className="font-medium text-white">
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
                  <span className="font-medium">Mensal</span>
                </div>
                <div>
                  <span className="text-gray-400">Valor original:</span>{' '}
                  <span className="font-medium">{formatCurrency(result.originalValue)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Percentual da multa:</span>{' '}
                  <span className="font-medium">{result.finePercentage}%</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                <p className="text-xs text-blue-300">
                  <strong>📅 Metodologia PGE/SP:</strong> A data inicial é automaticamente ajustada para +1 mês 
                  (ex: 04/01/2019 → 04/02/2019) e o último mês do período recebe taxa fixa de 1%.
                </p>
              </div>
              
              {(result.startDateWasAdjusted || result.endDateWasAdjusted) && (
                <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                  <p className="text-xs text-yellow-300">
                    <strong>⚠️ Ajuste de dias úteis:</strong> * A data informada não é dia útil, 
                    a data utilizada para este cálculo refere-se ao primeiro dia útil subsequente.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 bg-gray-900/50 rounded-lg border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Resumo do Cálculo</h3>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      id="include-header-checkbox"
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span>Copiar com cabeçalho</span>
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={(event) => {
                        const includeHeader = (document.getElementById('include-header-checkbox') as HTMLInputElement).checked;
                        const multaValue = result.correctedOriginalValue * (result.finePercentage / 100);
                        const header = 'Termo Inicial\tPrincipal\tCorreção SELIC (%)\tValor Juros\tPrincipal Atualizado\tMulta%\tMulta\tPrincipal + Multa';
                        const dataRow = `${result.originalStartDate?.split('-').reverse().join('/')}\t${result.originalValue.toFixed(2)}\t${result.correctionPercentage.toFixed(2)}%\t${result.originalValueCorrection.toFixed(2)}\t${result.correctedOriginalValue.toFixed(2)}\t${result.finePercentage}%\t${multaValue.toFixed(2)}\t${result.finalFineValue.toFixed(2)}`;
                        const copyData = includeHeader ? `${header}\n${dataRow}` : dataRow;
                        navigator.clipboard.writeText(copyData);
                        // Feedback visual
                        const button = event.target as HTMLButtonElement;
                        const originalText = button.textContent;
                        button.textContent = '✅ Copiado!';
                        button.className = button.className.replace('bg-blue-600 hover:bg-blue-700', 'bg-green-600');
                        setTimeout(() => {
                          button.textContent = originalText;
                          button.className = button.className.replace('bg-green-600', 'bg-blue-600 hover:bg-blue-700');
                        }, 2000);
                      }}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                      title="Copiar formato TSV (Tab Separated Values) - para Excel/Sheets"
                    >
                      📋 TSV
                    </button>
                    <button
                      onClick={(event) => {
                        const includeHeader = (document.getElementById('include-header-checkbox') as HTMLInputElement).checked;
                        const multaValue = result.correctedOriginalValue * (result.finePercentage / 100);
                        const header = 'Termo Inicial,Principal,Correção SELIC (%),Valor Juros,Principal Atualizado,Multa%,Multa,Principal + Multa';
                        const dataRow = `${result.originalStartDate?.split('-').reverse().join('/')},${result.originalValue.toFixed(2)},${result.correctionPercentage.toFixed(2)}%,${result.originalValueCorrection.toFixed(2)},${result.correctedOriginalValue.toFixed(2)},${result.finePercentage}%,${multaValue.toFixed(2)},${result.finalFineValue.toFixed(2)}`;
                        const copyData = includeHeader ? `${header}\n${dataRow}` : dataRow;
                        navigator.clipboard.writeText(copyData);
                        const button = event.target as HTMLButtonElement;
                        const originalText = button.textContent;
                        button.textContent = '✅ Copiado!';
                        button.className = button.className.replace('bg-green-600 hover:bg-green-700', 'bg-blue-600');
                        setTimeout(() => {
                          button.textContent = originalText;
                          button.className = button.className.replace('bg-blue-600', 'bg-green-600 hover:bg-green-700');
                        }, 2000);
                      }}
                      className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 rounded transition-colors"
                      title="Copiar formato CSV (Comma Separated Values) - para importação"
                    >
                      📊 CSV
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-center py-3 px-2 font-semibold">Termo Inicial</th>
                      <th className="text-center py-3 px-2 font-semibold">Principal</th>
                      <th className="text-center py-3 px-2 font-semibold">Correção SELIC (%)</th>
                      <th className="text-center py-3 px-2 font-semibold">Valor Juros</th>
                      <th className="text-center py-3 px-2 font-semibold">Principal Atualizado</th>
                      <th className="text-center py-3 px-2 font-semibold">Multa%</th>
                      <th className="text-center py-3 px-2 font-semibold">Multa</th>
                      <th className="text-center py-3 px-2 font-semibold">Principal + Multa</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700">
                      <td 
                        className="text-center py-3 px-2 font-mono text-blue-400 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 rounded"
                        onClick={(e) => {
                          const value = result.originalStartDate?.split('-').reverse().join('/') || 'N/A';
                          copyToClipboard(value, e.currentTarget);
                        }}
                        title="Clique para copiar a data"
                      >
                        {result.originalStartDate?.split('-').reverse().join('/') || 'N/A'}
                      </td>
                      <td 
                        className="text-center py-3 px-2 font-mono text-white cursor-pointer hover:bg-gray-800/50 transition-all duration-200 rounded"
                        onClick={(e) => {
                          copyToClipboard(result.originalValue.toFixed(2).replace('.', ','), e.currentTarget);
                        }}
                        title="Clique para copiar o valor (formato numérico)"
                      >
                        {formatCurrency(result.originalValue)}
                      </td>
                      <td 
                        className="text-center py-3 px-2 font-mono text-green-400 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 rounded"
                        onClick={(e) => {
                          copyToClipboard(result.correctionPercentage.toFixed(2).replace('.', ','), e.currentTarget);
                        }}
                        title="Clique para copiar o percentual (formato numérico)"
                      >
                        {result.correctionPercentage.toFixed(2)}%
                      </td>
                      <td 
                        className="text-center py-3 px-2 font-mono text-yellow-400 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 rounded"
                        onClick={(e) => {
                          copyToClipboard(result.originalValueCorrection.toFixed(2).replace('.', ','), e.currentTarget);
                        }}
                        title="Clique para copiar o valor (formato numérico)"
                      >
                        {formatCurrency(result.originalValueCorrection)}
                      </td>
                      <td 
                        className="text-center py-3 px-2 font-mono text-blue-400 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 rounded"
                        onClick={(e) => {
                          copyToClipboard(result.correctedOriginalValue.toFixed(2).replace('.', ','), e.currentTarget);
                        }}
                        title="Clique para copiar o valor (formato numérico)"
                      >
                        {formatCurrency(result.correctedOriginalValue)}
                      </td>
                      <td 
                        className="text-center py-3 px-2 font-mono text-orange-400 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 rounded"
                        onClick={(e) => {
                          copyToClipboard(result.finePercentage.toString().replace('.', ','), e.currentTarget);
                        }}
                        title="Clique para copiar o percentual (formato numérico)"
                      >
                        {result.finePercentage}%
                      </td>
                      <td 
                        className="text-center py-3 px-2 font-mono text-red-400 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 rounded"
                        onClick={(e) => {
                          const multaValue = result.correctedOriginalValue * (result.finePercentage / 100);
                          copyToClipboard(multaValue.toFixed(2).replace('.', ','), e.currentTarget);
                        }}
                        title="Clique para copiar o valor da multa (formato numérico)"
                      >
                        {formatCurrency(result.correctedOriginalValue * (result.finePercentage / 100))}
                      </td>
                      <td 
                        className="text-center py-3 px-2 font-mono font-bold text-green-400 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 rounded"
                        onClick={(e) => {
                          copyToClipboard(result.finalFineValue.toFixed(2).replace('.', ','), e.currentTarget);
                        }}
                        title="Clique para copiar o valor (formato numérico)"
                      >
                        {formatCurrency(result.finalFineValue)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
                <p className="text-xs text-blue-300">
                  <strong>📋 Formatos de cópia:</strong> 
                  <strong className="text-blue-200">TSV</strong> (separado por tabs) - ideal para Excel/Google Sheets | 
                  <strong className="text-green-200">CSV</strong> (separado por vírgulas) - padrão para importação.
                  <br />
                  <strong>🖱️ Cópia individual:</strong> Clique em qualquer valor da tabela para copiá-lo (formato numérico brasileiro).
                  <br />
                  <strong>Metodologia PGE/SP:</strong> Correção do principal pela SELIC + aplicação da multa sobre o valor já corrigido.
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
