// app/api/results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

export const runtime = 'nodejs';

// Interface atualizada para incluir districtsData
interface ApiData {
  time: number;
  candidateVotes: Record<string, any>[];
  proportionalVotes: Record<string, any>[];
  districtsData: Record<string, any>[]; // <-- NOVO
}

interface ApiError {
  error: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiData | ApiError>> {
  const clientEmail: string | undefined = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey: string | undefined = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId: string | undefined = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    console.error("Erro: Variáveis de ambiente do Google Sheets não configuradas.");
    return NextResponse.json({ error: 'Erro interno do servidor. Credenciais não configuradas.' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const timeParam: string | null = searchParams.get('time');
  const validTimes: string[] = ['50', '100']; // Ajuste se tiver mais snapshots
  const time: string = timeParam !== null && validTimes.includes(timeParam) ? timeParam : '100';

  try {
    const serviceAccountAuth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const doc: GoogleSpreadsheet = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo();

    // Nomes das abas (Certifique-se que 'districts_data' está correto)
    const candidateSheetTitle: string = `candidates_data_votes_${time}`;
    const proportionalSheetTitle: string = `proportional_data_votes_${time}`;
    const districtInfoSheetTitle: string = 'districts_data'; // <-- NOVO

    // Acessar as abas
    const candidateSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[candidateSheetTitle];
    const proportionalSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[proportionalSheetTitle];
    const districtInfoSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[districtInfoSheetTitle]; // <-- NOVO

    // Validar se todas as abas foram encontradas
    if (!candidateSheet) {
      return NextResponse.json({ error: `Aba de candidatos não encontrada para ${time}%` }, { status: 404 });
    }
    if (!proportionalSheet) {
      return NextResponse.json({ error: `Aba proporcional não encontrada para ${time}%` }, { status: 404 });
    }
    if (!districtInfoSheet) { // <-- NOVO
      return NextResponse.json({ error: `Aba de distritos ('${districtInfoSheetTitle}') não encontrada` }, { status: 404 });
    }

    // Buscar as linhas de todas as abas necessárias
    // Usamos Promise.all para buscar em paralelo (mais rápido)
    const [candidateRows, proportionalRows, districtRows] = await Promise.all([
        candidateSheet.getRows<Record<string, any>>(),
        proportionalSheet.getRows<Record<string, any>>(),
        districtInfoSheet.getRows<Record<string, any>>(), // <-- NOVO
    ]);

    // Formatar os dados
    const candidateVotes = candidateRows.map(row => row.toObject());
    const proportionalVotes = proportionalRows.map(row => row.toObject());
    const districtsData = districtRows.map(row => row.toObject()); // <-- NOVO

    // Preparar a resposta incluindo os dados dos distritos
    const responseData: ApiData = {
      time: parseInt(time, 10),
      candidateVotes,
      proportionalVotes,
      districtsData, // <-- NOVO
    };

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    console.error('Erro ao buscar dados do Google Sheets:', error);
    let errorMessage = 'Erro ao buscar dados da planilha.';
    let errorStatus = 500;
    // ... (lógica de tratamento de erro existente) ...
     if (error && typeof error === 'object' && 'response' in error) {
       const responseError = error as { response?: { status?: number } };
       if (responseError.response?.status === 403) {
         errorMessage = 'Erro de permissão (403). Verifique compartilhamento/API.';
         errorStatus = 403;
       } else if (responseError.response?.status === 400) {
            errorMessage = 'Erro de requisição (400). Verifique o tipo/ID da planilha.';
            errorStatus = 400;
       }
    } else if (error instanceof Error) {
        // Potencialmente usar error.message com cuidado em dev
    }
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
}