// lib/server/sheets.ts
// Leitura das abas de votos do Google Sheets (somente servidor).
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export const parseSheetNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value.replace(/\./g, '').replace(',', '.'));
    return isNaN(n) ? 0 : n;
  }
  return 0;
};

export function sheetsConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SHEETS_CLIENT_EMAIL && process.env.GOOGLE_SHEETS_PRIVATE_KEY && process.env.GOOGLE_SHEET_ID);
}

/** Lê as abas `candidates_data_votes_{time}` e `proportional_data_votes_{time}`. */
export async function readVoteSheets(time: string) {
  const auth = new JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID as string, auth);
  await doc.loadInfo();
  const candidateSheet = doc.sheetsByTitle[`candidates_data_votes_${time}`];
  const proportionalSheet = doc.sheetsByTitle[`proportional_data_votes_${time}`];
  if (!candidateSheet || !proportionalSheet) throw new Error(`Abas de ${time}% não encontradas na planilha.`);
  const [candidateRows, proportionalRows] = await Promise.all([
    candidateSheet.getRows<Record<string, any>>(),
    proportionalSheet.getRows<Record<string, any>>(),
  ]);
  return {
    candidates: candidateRows.map(r => r.toObject() as Record<string, any>),
    proportional: proportionalRows.map(r => r.toObject() as Record<string, any>),
  };
}
