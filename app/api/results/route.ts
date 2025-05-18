// app/api/results/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
// Importar tipos compartilhados (ajuste o caminho se não estiver usando alias @)
import { CandidateVote, ProportionalVote } from '@/types/election';

// Força o uso do runtime Node.js
export const runtime = 'nodejs';

// Interface para a resposta desta API (agora só votos)
interface ApiVotesData {
  time: number;
  candidateVotes: CandidateVote[];
  proportionalVotes: ProportionalVote[];
}

// Interface para erros
interface ApiError {
  error: string;
}

// Helper para parsear números que podem ter pontos como separador de milhar
const parseNumber = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        // Remove pontos de milhar e substitui vírgula decimal por ponto (se houver)
        const cleanedStr = value.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
    }
    // Retorna 0 se não for string nem número ou se for NaN após parse
    return 0;
  };

// Função principal que lida com requisições GET para /api/results
export async function GET(request: NextRequest): Promise<NextResponse<ApiVotesData | ApiError>> {
  // ---- 1. Leitura e Validação das Credenciais ----
  const clientEmail: string | undefined = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey: string | undefined = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId: string | undefined = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    console.error("[Results API] Erro: Variáveis de ambiente do Google Sheets não configuradas.");
    return NextResponse.json({ error: 'Erro interno do servidor. Credenciais não configuradas.' }, { status: 500 });
  }

  // ---- 2. Obtenção do Parâmetro 'time' ----
  const searchParams = request.nextUrl.searchParams;
  const timeParam: string | null = searchParams.get('time');
  const validTimes: string[] = ['50', '100']; // Adicione outros tempos (ex: '25', '75') se você os criou nas planilhas
  const time: string = timeParam !== null && validTimes.includes(timeParam) ? timeParam : '100';

  try {
    // ---- 3. Autenticação com Google Sheets API ----
    const serviceAccountAuth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Permissão de apenas leitura
    });

    // ---- 4. Acesso à Planilha e Abas de Votos ----
    const doc: GoogleSpreadsheet = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo(); // Carrega metadados gerais e lista de abas

    // Nomes das abas que dependem do tempo
    const candidateSheetTitle: string = `candidates_data_votes_${time}`;
    const proportionalSheetTitle: string = `proportional_data_votes_${time}`;

    // Acessar as abas pelo título
    const candidateSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[candidateSheetTitle];
    const proportionalSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[proportionalSheetTitle];

    // Validar se as abas de votos foram encontradas
    if (!candidateSheet) {
      console.error(`[Results API] Aba não encontrada: ${candidateSheetTitle}`);
      return NextResponse.json({ error: `Dados de candidatos não encontrados para ${time}%` }, { status: 404 });
    }
    if (!proportionalSheet) {
      console.error(`[Results API] Aba não encontrada: ${proportionalSheetTitle}`);
      return NextResponse.json({ error: `Dados proporcionais não encontrados para ${time}%` }, { status: 404 });
    }

    // ---- 5. Busca e Processamento dos Dados das Abas ----
    // Busca as linhas das duas abas em paralelo
    const [candidateRows, proportionalRows] = await Promise.all([
        candidateSheet.getRows<Record<string, any>>(), // Busca como objeto genérico inicialmente
        proportionalSheet.getRows<Record<string, any>>(),
    ]);

    // Formatar e Validar Votos dos Candidatos
    const candidateVotes = candidateRows
        .map(row => row.toObject() as Partial<CandidateVote>) // Mapeia para objeto parcial
        .filter((vote): vote is CandidateVote => // Filtra usando Type Guard para garantir campos essenciais
            vote.district_id !== undefined && vote.district_id !== null &&
            vote.candidate_name !== undefined && vote.candidate_name !== null && vote.candidate_name !== '' &&
            vote.votes_qtn !== undefined && vote.votes_qtn !== null
            // Adicione validação para party_legend se for essencial para o frontend
            // vote.party_legend !== undefined && vote.party_legend !== null && vote.party_legend !== ''
        )
        .map(vote => ({ // Mapeia para o tipo final, fazendo conversões/limpeza
            ...vote,
            district_id: typeof vote.district_id === 'string' ? parseInt(vote.district_id, 10) : vote.district_id, // Garante número
            votes_qtn: parseNumber(vote.votes_qtn), // Usa helper para parsear número
            // Garante que campos opcionais sejam null se não vierem
            parl_front_legend: vote.parl_front_legend ?? null,
            candidate_status: vote.candidate_status ?? null,
            candidate_photo: vote.candidate_photo ?? null,
            party_legend: vote.party_legend ?? 'N/A' // Exemplo: Default se party_legend for opcional mas necessário
        }));

    // Formatar e Validar Votos Proporcionais
    const proportionalVotes = proportionalRows
        .map(row => row.toObject() as Partial<ProportionalVote>) // Mapeia para objeto parcial
        .filter((vote): vote is ProportionalVote => // Filtra usando Type Guard
            vote.uf !== undefined && vote.uf !== null && vote.uf !== '' &&
            vote.parl_front_legend !== undefined && vote.parl_front_legend !== null && vote.parl_front_legend !== '' &&
            vote.proportional_votes_qtn !== undefined && vote.proportional_votes_qtn !== null
        )
        .map(vote => ({ // Mapeia para o tipo final
            ...vote,
            proportional_votes_qtn: parseNumber(vote.proportional_votes_qtn), // Usa helper
            parlamentar_front: vote.parlamentar_front ?? null,
        }));

    // ---- 6. Preparar e Retornar a Resposta ----
    const responseData: ApiVotesData = {
      time: parseInt(time, 10),
      candidateVotes,
      proportionalVotes,
    };

    return NextResponse.json(responseData);

  } catch (error: unknown) {
    // ---- 7. Tratamento de Erro ----
    console.error('Erro ao buscar dados de VOTOS do Google Sheets:', error);
    let errorMessage = 'Erro ao buscar dados de votos da planilha.';
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
            // Logar mais detalhes do erro da API do Google se disponível
             console.error('Google API Error details:', responseError.response?.data);
        } else if (error instanceof Error && 'code' in error) {
             // Captura outros erros comuns, como ERR_OSSL_UNSUPPORTED (embora deva estar resolvido)
             const nodeError = error as NodeJS.ErrnoException;
             errorMessage = `Erro interno (${nodeError.code}): ${nodeError.message}`;
        } else if (error instanceof Error) {
             errorMessage = error.message; // Usar com cautela em produção
        }
    }

    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
}