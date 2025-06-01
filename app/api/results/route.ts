// app/api/results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { CandidateVote, ProportionalVote } from '@/types/election';

export const runtime = 'nodejs';

interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
}

interface ApiError {
  error: string;
}

// --- Cache Simples em Memória ---
interface CacheEntry {
  data: ApiVotesData;
  timestamp: number;
}
let cache: CacheEntry | null = null;
const CACHE_DURATION_MS = 1 * 60 * 1000; // Cache por 1 minuto, por exemplo

// ... (seu helper parseNumber e outras constantes) ...
const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const cleanedStr = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    return 0;
  };

export async function GET(request: NextRequest): Promise<NextResponse<ApiVotesData | ApiError>> {
  const searchParams = request.nextUrl.searchParams;
  const timeParam: string | null = searchParams.get('time');
  const validTimes: string[] = ['50', '100'];
  const time: string = timeParam !== null && validTimes.includes(timeParam) ? timeParam : '100'; // Usado para nome da aba

  // ---- VERIFICAR CACHE PRIMEIRO ----
  // Considerar se o 'time' deve invalidar o cache ou se o cache é sempre para o 'time' mais comum.
  // Para este exemplo, o cache é genérico. Se diferentes 'time' retornam dados diferentes,
  // o cache precisaria ser mais complexo (ex: um objeto onde a chave é o 'time').
  // Assumindo que o cache é para os dados mais recentes/comuns (time=100).
  if (cache && (Date.now() - cache.timestamp < CACHE_DURATION_MS)) {
    console.log("[Results API] Servindo dados do cache.");
    return NextResponse.json(cache.data);
  }
  console.log("[Results API] Cache inválido ou expirado. Buscando dados da planilha.");

  // ---- 1. Leitura e Validação das Credenciais ----
  const clientEmail: string | undefined = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey: string | undefined = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId: string | undefined = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    console.error("[Results API] Erro: Variáveis de ambiente do Google Sheets não configuradas.");
    return NextResponse.json({ error: 'Erro interno do servidor. Credenciais não configuradas.' }, { status: 500 });
  }

  try {
    // ---- 3. Autenticação com Google Sheets API ----
    const serviceAccountAuth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // ---- 4. Acesso à Planilha e Abas de Votos ----
    const doc: GoogleSpreadsheet = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    console.log("[Results API] Carregando informações do documento (doc.loadInfo)...");
    await doc.loadInfo();
    console.log("[Results API] Informações do documento carregadas.");


    const candidateSheetTitle: string = `candidates_data_votes_${time}`;
    const proportionalSheetTitle: string = `proportional_data_votes_${time}`;

    const candidateSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[candidateSheetTitle];
    const proportionalSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[proportionalSheetTitle];

    if (!candidateSheet) {
      console.error(`[Results API] Aba não encontrada: ${candidateSheetTitle}`);
      return NextResponse.json({ error: `Dados de candidatos não encontrados para ${time}%` }, { status: 404 });
    }
    if (!proportionalSheet) {
      console.error(`[Results API] Aba não encontrada: ${proportionalSheetTitle}`);
      return NextResponse.json({ error: `Dados proporcionais não encontrados para ${time}%` }, { status: 404 });
    }
    console.log(`[Results API] Abas encontradas: ${candidateSheetTitle}, ${proportionalSheetTitle}`);

    // ---- 5. Busca e Processamento dos Dados das Abas ----
    console.log("[Results API] Buscando linhas das abas (getRows)...");
    const [candidateRows, proportionalRows] = await Promise.all([
        candidateSheet.getRows<Record<string, any>>(),
        proportionalSheet.getRows<Record<string, any>>(),
    ]);
    console.log("[Results API] Linhas das abas buscadas.");

    // ... (seu código de formatação e validação de candidateVotes e proportionalVotes) ...
    // Formatar e Validar Votos dos Candidatos
    const candidateVotes = candidateRows
        .map(row => row.toObject() as Partial<CandidateVote>) 
        .filter((vote): vote is CandidateVote => 
            vote.district_id !== undefined && vote.district_id !== null &&
            vote.candidate_name !== undefined && vote.candidate_name !== null && vote.candidate_name !== '' &&
            vote.votes_qtn !== undefined && vote.votes_qtn !== null
        )
        .map(vote => ({ 
            ...vote,
            district_id: typeof vote.district_id === 'string' ? parseInt(vote.district_id, 10) : vote.district_id, 
            votes_qtn: parseNumber(vote.votes_qtn), 
            parl_front_legend: vote.parl_front_legend ?? null,
            candidate_status: vote.candidate_status ?? null,
            candidate_photo: vote.candidate_photo ?? null,
            party_legend: vote.party_legend ?? 'N/A' 
        }));

    // Formatar e Validar Votos Proporcionais
    const proportionalVotes = proportionalRows
        .map(row => row.toObject() as Partial<ProportionalVote>) 
        .filter((vote): vote is ProportionalVote => 
            vote.uf !== undefined && vote.uf !== null && vote.uf !== '' &&
            vote.parl_front_legend !== undefined && vote.parl_front_legend !== null && vote.parl_front_legend !== '' &&
            vote.proportional_votes_qtn !== undefined && vote.proportional_votes_qtn !== null
        )
        .map(vote => ({ 
            ...vote,
            proportional_votes_qtn: parseNumber(vote.proportional_votes_qtn), 
            parlamentar_front: vote.parlamentar_front ?? null,
        }));


    // ---- 6. Preparar e Retornar a Resposta ----
    const responseData: ApiVotesData = {
      time: parseInt(time, 10),
      candidateVotes,
      proportionalVotes,
    };

    // ---- ARMAZENAR NO CACHE ----
    cache = { data: responseData, timestamp: Date.now() };
    console.log("[Results API] Dados armazenados no cache.");

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    // ... (seu tratamento de erro) ...
    console.error('[Results API] Erro ao buscar dados de VOTOS do Google Sheets:', error);
    let errorMessage = 'Erro ao buscar dados de votos da planilha.';
    // ... (resto do seu error handling)
    // Copiando seu error handling para completude
    let errorStatus = 500;
    if (error && typeof error === 'object') {
        if ('response' in error) {
            const responseError = error as { response?: { status?: number; data?: any } };
            if (responseError.response?.status === 403) {
                errorMessage = 'Erro de permissão (403). Verifique compartilhamento/API.';
                errorStatus = 403;
            } else if (responseError.response?.status === 400) {
                errorMessage = `Erro de requisição (400): ${responseError.response?.data?.error?.message || 'Verifique o tipo/ID da planilha.'}`;
                errorStatus = 400;
            }
             console.error('[Results API] Google API Error details:', responseError.response?.data);
        } else if (error instanceof Error && 'code' in error) {
             const nodeError = error as NodeJS.ErrnoException;
             errorMessage = `Erro interno (${nodeError.code}): ${nodeError.message}`;
        } else if (error instanceof Error) {
             errorMessage = error.message;
        }
    }
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
}