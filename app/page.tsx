// app/page.tsx
"use client"; // Necessário para usar useState e useEffect

import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import ResultsTable from '../components/ResultsTable';
// Não precisamos mais do mockData! Vamos buscar dados reais.
// import { getMockResults } from '../lib/mockData';

// Definindo a estrutura esperada dos dados da API (Boa prática com TypeScript)
interface ApiResultData {
  time: number;
  candidateVotes: Record<string, any>[];
  proportionalVotes: Record<string, any>[];
}

export default function Home() {
  // Estado para controlar o percentual de apuração (começa em 50%)
  const [currentTime, setCurrentTime] = useState<number>(50);

  // --- Novos Estados para Dados da API ---
  // Estado para guardar os dados vindos da API
  const [apiData, setApiData] = useState<ApiResultData | null>(null);
  // Estado para controlar o indicador de carregamento
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Estado para guardar mensagens de erro da API
  const [error, setError] = useState<string | null>(null);

  // --- Efeito para buscar dados da API ---
  useEffect(() => {
    // Função assíncrona para buscar os dados
    const fetchData = async () => {
      setIsLoading(true); // Inicia o carregamento
      setError(null); // Limpa erros anteriores
      setApiData(null); // Limpa dados anteriores (opcional)

      try {
        // Chama a nossa API route, passando o tempo atual como parâmetro
        const response = await fetch(`/api/results?time=${currentTime}`);

        // Verifica se a resposta da API foi bem-sucedida (status 2xx)
        if (!response.ok) {
          // Se não foi OK, tenta ler a mensagem de erro do corpo da resposta
          const errorData = await response.json();
          throw new Error(errorData.error || `Erro ${response.status} ao buscar dados`);
        }

        // Se foi OK, converte a resposta para JSON
        const data: ApiResultData = await response.json();
        setApiData(data); // Guarda os dados no estado

      } catch (err: unknown) {
        // Captura erros (rede, JSON inválido, erro lançado acima)
        console.error("Falha ao buscar dados da API:", err);
        setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
      } finally {
        setIsLoading(false); // Finaliza o carregamento, mesmo se deu erro
      }
    };

    fetchData(); // Executa a função de busca

    // O useEffect vai rodar novamente sempre que `currentTime` mudar
  }, [currentTime]);

  // --- Renderização Condicional ---
  let content;
  if (isLoading) {
    content = <p>Carregando dados ({currentTime}%)...</p>;
  } else if (error) {
    content = <p style={{ color: 'red' }}>Erro ao carregar dados: {error}</p>;
  } else if (apiData) {
    // Se carregou sem erro e temos dados, renderiza as tabelas
    content = (
      <>
        <ResultsTable title={`Votos por Candidato (Distrital) - ${apiData.time}%`} data={apiData.candidateVotes} />
        <br />
        <ResultsTable title={`Votos Proporcionais (por UF/Frente) - ${apiData.time}%`} data={apiData.proportionalVotes} />
      </>
    );
  } else {
    content = <p>Nenhum dado para exibir.</p>; // Caso não esteja carregando, sem erro, mas sem dados
  }

  return (
    <div>
      <Head>
        <title>Painel Apuração Haagar</title>
        <meta name="description" content="Simulador de apuração eleitoral" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ padding: '2rem' }}>
        <h1>Painel de Apuração (Real via API)</h1>

        {/* Controles para mudar o tempo */}
        <div>
          <h3>Ver Apuração em:</h3>
          <button onClick={() => setCurrentTime(50)} disabled={currentTime === 50 || isLoading}>50%</button>
          <button onClick={() => setCurrentTime(100)} disabled={currentTime === 100 || isLoading}>100%</button>
          {/* Desabilitamos os botões enquanto carrega (isLoading) */}
          <p>Mostrando resultados para: {currentTime}%</p>
        </div>
        <hr />

        {/* Exibe o conteúdo (Carregando, Erro ou Tabelas) */}
        {content}

      </main>
    </div>
  );
}