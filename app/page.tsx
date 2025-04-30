// app/page.tsx 

"use client";
import React, { useState } from 'react';
import Head from 'next/head';
import ResultsTable from '../components/ResultsTable'; // Ajuste o caminho se necessário
import { getMockResults } from '../lib/mockData'; // Ajuste o caminho se necessário

export default function Home() {
  // Estado para controlar o percentual de apuração (começa em 50%)
  const [currentTime, setCurrentTime] = useState(50);

  // Busca os dados mockados para o tempo atual
  const results = getMockResults(currentTime);

  return (
    <div>
      <Head>
        <title>Painel Apuração Haagar</title>
        <meta name="description" content="Simulador de apuração eleitoral" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main style={{ padding: '2rem' }}>
        <h1>Painel de Apuração (Simulado)</h1>

        {/* Controles para mudar o tempo */}
        <div>
          <h3>Ver Apuração em:</h3>
          <button onClick={() => setCurrentTime(50)} disabled={currentTime === 50}>50%</button>
          <button onClick={() => setCurrentTime(100)} disabled={currentTime === 100}>100%</button>
          <p>Mostrando resultados para: {currentTime}%</p>
        </div>
        <hr />

        {/* Exibe a tabela de votos de candidatos */}
        <ResultsTable title="Votos por Candidato (Distrital)" data={results.candidateVotes} />

        <br />

        {/* Exibe a tabela de votos proporcionais (adapte se quiser outro tipo de gráfico) */}
        <ResultsTable title="Votos Proporcionais (por UF/Frente)" data={results.proportionalVotes} />

      </main>
    </div>
  );
}