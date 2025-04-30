import { NextRequest, NextResponse } from 'next/server';
import { GoogleSpreadsheet, GoogleSpreadsheetWorksheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

// Força o uso do runtime Node.js (essencial para módulos como 'fs' usados pelas libs)
export const runtime = 'nodejs';

// Interface para tipar os dados retornados pela API (opcional, mas boa prática)
interface ApiData {
  time: number;
  candidateVotes: Record<string, any>[]; // Array de objetos genéricos (linhas da planilha)
  proportionalVotes: Record<string, any>[]; // Array de objetos genéricos
}

// Interface para tipar erros específicos se necessário
interface ApiError {
  error: string;
}

// Função principal que lida com requisições GET para /api/results
export async function GET(request: NextRequest): Promise<NextResponse<ApiData | ApiError>> {
  // Ler as credenciais das variáveis de ambiente
  const clientEmail: string | undefined = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  // A chave privada pode conter literais \n que precisam ser convertidos
  const privateKey: string | undefined = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId: string | undefined = process.env.GOOGLE_SHEET_ID;

  // Validar se as variáveis de ambiente foram carregadas
  if (!clientEmail || !privateKey || !sheetId) {
    console.error("Erro: Variáveis de ambiente do Google Sheets não configuradas.");
    return NextResponse.json(
      { error: 'Erro interno do servidor. Credenciais não configuradas.' },
      { status: 500 }
    );
  }

  // Pega o parâmetro 'time' da URL (ex: /api/results?time=50)
  const searchParams = request.nextUrl.searchParams;
  const timeParam: string | null = searchParams.get('time');
  // Define o tempo padrão como '100' se não for fornecido ou inválido
  // Ajuste o array se tiver mais snapshots (ex: '25', '75')
  const validTimes: string[] = ['50', '100'];
  const time: string = timeParam !== null && validTimes.includes(timeParam) ? timeParam : '100';

  try {
    // Configurar autenticação com a conta de serviço
    // O tipo para as opções do JWT é JWTInput, mas pode ser complexo de importar diretamente.
    // Usamos a estrutura esperada aqui.
    const serviceAccountAuth = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Apenas leitura
    });

    // Inicializar o acesso à planilha
    const doc: GoogleSpreadsheet = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
    await doc.loadInfo(); // Carrega metadados da planilha (títulos das abas, etc.)

    // Nomes das abas baseados no tempo (ajuste se os nomes forem diferentes!)
    const candidateSheetTitle: string = `candidates_data_votes_${time}`;
    const proportionalSheetTitle: string = `proportional_data_votes_${time}`;

    // Acessar as abas específicas pelo título
    const candidateSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[candidateSheetTitle];
    const proportionalSheet: GoogleSpreadsheetWorksheet | undefined = doc.sheetsByTitle[proportionalSheetTitle];

    // Verificar se as abas foram encontradas
    if (!candidateSheet) {
      console.error(`Erro: Aba da planilha não encontrada: ${candidateSheetTitle}`);
      return NextResponse.json({ error: `Dados de candidatos não encontrados para o tempo ${time}%` }, { status: 404 });
    }
    if (!proportionalSheet) {
      console.error(`Erro: Aba da planilha não encontrada: ${proportionalSheetTitle}`);
      return NextResponse.json({ error: `Dados proporcionais não encontrados para o tempo ${time}%` }, { status: 404 });
    }

    // Buscar todas as linhas das abas
    // Usamos um tipo genérico para as linhas, pois as colunas dependem do seu header
    const candidateRows: GoogleSpreadsheetRow<Record<string, any>>[] = await candidateSheet.getRows();
    const proportionalRows: GoogleSpreadsheetRow<Record<string, any>>[] = await proportionalSheet.getRows();

    // Formatar os dados para retornar como JSON simples
    // O método .toObject() cria um objeto { header: value } para cada linha
    const candidateVotes = candidateRows.map(row => row.toObject());
    const proportionalVotes = proportionalRows.map(row => row.toObject());

    // Preparar os dados de resposta com tipo definido
    const responseData: ApiData = {
      time: parseInt(time, 10), // Converte tempo para número
      candidateVotes,
      proportionalVotes,
    };

    // Retornar os dados combinados
    return NextResponse.json(responseData);

  } catch (error: unknown) { // Tipar o erro como unknown é mais seguro
    console.error('Erro ao buscar dados do Google Sheets:', error);

    // Tentar identificar erros específicos (ex: erro de permissão)
    // Isso requer cuidado pois a estrutura do erro pode variar
    let errorMessage = 'Erro ao buscar dados da planilha.';
    let errorStatus = 500;

    if (error && typeof error === 'object' && 'response' in error) {
      // Verificação básica se o erro parece ter uma resposta HTTP (comum em erros de API)
       const responseError = error as { response?: { status?: number } }; // Type assertion
       if (responseError.response?.status === 403) {
         errorMessage = 'Erro de permissão ao acessar a planilha. Verifique o compartilhamento e a ativação da API.';
         errorStatus = 403;
       }
    } else if (error instanceof Error) {
        // Se for uma instância de Error padrão, podemos usar sua mensagem
        // Evite expor mensagens de erro muito detalhadas em produção
         // errorMessage = error.message; // Use com cautela
    }

    // Retornar um erro genérico ou específico formatado para o cliente
    return NextResponse.json({ error: errorMessage }, { status: errorStatus });
  }
}