import { readFileSync } from 'fs';
import { join } from 'path';

export interface CSVDebitData {
  principal: number;
  termoInicial: Date;
  correcaoSelic: number;
  principalAtualizado: number;
  multa: number;
}

export interface CSVRecord {
  Item: string;
  FatoGerador: string;
  Principal: string;
  TermoInicial: string;
  CorrecaoSelicPercent: string;
  ValorJuros: string;
  PrincipalAtualizado: string;
  MultaPercent: string;
  ValorMulta: string;
}

export function readCSVTestData(): CSVRecord[] {
  try {
    const csvPath = join(__dirname, 'debit_update.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    return parseCSV(csvContent);
  } catch (error) {
    console.error('Erro ao ler CSV:', error);
    return [];
  }
}

function parseCSV(content: string): CSVRecord[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  console.log('Headers encontrados:', headers);
  
  const records: CSVRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    
    if (values.length >= 9) {
      const record: CSVRecord = {
        Item: values[0] || '',
        FatoGerador: values[1] || '',
        Principal: values[2] || '0',
        TermoInicial: values[3] || '',
        CorrecaoSelicPercent: values[4] || '0',
        ValorJuros: values[5] || '0',
        PrincipalAtualizado: values[6] || '0',
        MultaPercent: values[7] || '0',
        ValorMulta: values[8] || '0'
      };
      records.push(record);
    }
  }

  return records;
}

export function convertDateFormat(dateStr: string): Date {
  // Converte de DD/MM/YYYY para Date
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

export function convertToDebitData(record: CSVRecord): CSVDebitData {
  return {
    principal: parseFloat(record.Principal.replace(/[^\d.,]/g, '').replace(',', '.')),
    termoInicial: convertDateFormat(record.TermoInicial),
    correcaoSelic: parseFloat(record.CorrecaoSelicPercent.replace(/[^\d.,]/g, '').replace(',', '.')),
    principalAtualizado: parseFloat(record.PrincipalAtualizado.replace(/[^\d.,]/g, '').replace(',', '.')),
    multa: parseFloat(record.ValorMulta.replace(/[^\d.,]/g, '').replace(',', '.'))
  };
}

export function calculatePercentageDifference(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return Math.abs((actual - expected) / expected) * 100;
}

// Mock simples da API SELIC para testes
export const mockSelicRates = {
  '2024-01': 10.75,
  '2024-02': 10.75,
  '2024-03': 10.75,
  '2024-04': 10.50,
  '2024-05': 10.50,
  '2024-06': 10.50,
  '2024-07': 10.50,
  '2024-08': 10.50,
  '2024-09': 10.75,
  '2024-10': 11.25,
  '2024-11': 11.25,
  '2024-12': 11.25,
  '2025-01': 12.25,
  '2025-02': 12.25,
  '2025-03': 12.25,
  '2025-04': 12.75,
  '2025-05': 13.25,
  '2025-06': 13.75,
  '2025-07': 14.25,
  '2025-08': 14.25,
  '2025-09': 14.25,
  '2025-10': 14.25
};

export function getMockSelicRate(year: number, month: number): number {
  const key = `${year}-${month.toString().padStart(2, '0')}`;
  return mockSelicRates[key as keyof typeof mockSelicRates] || 10.75;
}