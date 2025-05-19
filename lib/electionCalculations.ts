// lib/electionCalculations.ts

/**
 * Representa os votos proporcionais para uma legenda (frente/partido).
 */
export interface ProportionalVotesInput {
  legend: string; // Identificador da frente/partido (ex: parl_front_legend)
  votes: number;  // Total de votos proporcionais para esta legenda no estado
}

/**
 * Aloca assentos de representação proporcional usando o método D'Hondt
 * com uma cláusula de barreira.
 *
 * @param proportionalVotesForState Array de objetos com votos por legenda para um estado específico.
 * @param totalSeatsForState Número total de assentos proporcionais a serem alocados no estado.
 * @param barrierPercentage Percentual da cláusula de barreira (ex: 5 para 5%). Default é 5.
 * @returns Um Record onde a chave é a legenda e o valor é o número de assentos PR ganhos.
 */
export function calculateProportionalSeats(
  proportionalVotesForState: ProportionalVotesInput[],
  totalSeatsForState: number,
  barrierPercentage: number = 5
): Record<string, number> {
  const seatsWon: Record<string, number> = {};

  if (totalSeatsForState === 0 || proportionalVotesForState.length === 0) {
    return seatsWon;
  }

  // 1. Calcular o total de votos válidos para a eleição proporcional no estado
  const totalValidProportionalVotes = proportionalVotesForState.reduce(
    (sum, party) => sum + party.votes,
    0
  );

  if (totalValidProportionalVotes === 0) {
    return seatsWon;
  }

  // 2. Calcular o valor da cláusula de barreira em votos
  const barrierVotes = (barrierPercentage / 100) * totalValidProportionalVotes;

  // 3. Filtrar legendas que não atingiram a cláusula de barreira
  const eligibleParties = proportionalVotesForState.filter(
    (party) => party.votes >= barrierVotes
  );

  if (eligibleParties.length === 0) {
    return seatsWon; // Nenhuma legenda atingiu a cláusula de barreira
  }

  // 4. Inicializar a contagem de assentos para legendas elegíveis
  eligibleParties.forEach((party) => {
    seatsWon[party.legend] = 0;
  });

  // 5. Aplicar o método D'Hondt para alocar os assentos
  for (let i = 0; i < totalSeatsForState; i++) {
    let maxQuotient = -1;
    let partyToGetSeat = "";

    eligibleParties.forEach((party) => {
      const currentQuotient = party.votes / (seatsWon[party.legend] + 1);
      if (currentQuotient > maxQuotient) {
        maxQuotient = currentQuotient;
        partyToGetSeat = party.legend;
      } else if (currentQuotient === maxQuotient) {
        // Critério de desempate (opcional, D'Hondt pode não precisar se os votos forem únicos)
        // Se houver empate estrito nos quocientes, geralmente a legenda com mais votos totais
        // (antes da divisão) leva vantagem, ou por sorteio.
        // Para simplificar, a primeira encontrada com o quociente máximo leva.
        // Ou, para um desempate mais robusto (maior número de votos originais):
        const currentPartyTotalVotes = eligibleParties.find(p => p.legend === partyToGetSeat)?.votes || 0;
        if (party.votes > currentPartyTotalVotes) {
            partyToGetSeat = party.legend;
        }
      }
    });

    if (partyToGetSeat) {
      seatsWon[partyToGetSeat]++;
    } else {
      // Isso pode acontecer se não houver mais legendas elegíveis com votos
      // ou se todos os votos forem zero após a barreira, o que já é tratado.
      // Ou se o número de assentos for maior que o possível de alocar (raro).
      break;
    }
  }

  return seatsWon;
}