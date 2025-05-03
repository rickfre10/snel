// lib/staticData.ts

// --- Interfaces (podem vir de /types/election.ts se preferir) ---
export interface PartyInfo {
    party_name: string | null; // A primeira linha pode ter Nulos
    party_legend: string | null;
    party_number: number | null;
    parlamentar_front: string | null;
    parl_front_legend: string | null;
    party_color: string | null;
    parl_front_color: string | null;
  }
  
  export interface DistrictInfoFromData {
    uf: string;
    uf_name: string;
    district_name: string;
    city_name: string; // Mantido caso precise depois
    region_name: string; // Mantido caso precise depois
    district_id: number; // Convertido para número
    population: number; // Convertido para número
    voters_qtn: number; // Convertido para número
    polls_qtn: number; // Convertido para número
  }
  
  // --- Dados Estáticos ---
  
  export const partyData: PartyInfo[] = [
    // { party_name: null, party_legend: null, party_number: null, parlamentar_front: null, parl_front_legend: null, party_color: null, parl_front_color: null }, // Linha de header ou nula, removida se não for necessária
    { party_name: 'Articulação de Esquerda', party_legend: 'AE', party_number: 17, parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', party_color: '#ffcb3d', parl_front_color: '#19cf7d' },
    { party_name: 'Partido Liberal', party_legend: 'LIVRE', party_number: 19, parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', party_color: '#850099', parl_front_color: '#1d12b5' },
    { party_name: 'Partido Nacionalista', party_legend: 'NAC', party_number: 30, parlamentar_front: 'NAC', parl_front_legend: 'NAC', party_color: '#ff7700', parl_front_color: '#ff7700' },
    { party_name: 'Partido Conservador', party_legend: 'PCON', party_number: 25, parlamentar_front: 'Frente Conservadora', parl_front_legend: 'CON', party_color: '#858483', parl_front_color: '#858483' },
    { party_name: 'Partido Cristão', party_legend: 'PCRIS', party_number: 32, parlamentar_front: 'Frente Conservadora', parl_front_legend: 'CON', party_color: '#228000', parl_front_color: '#858483' },
    { party_name: 'Partido do Desenvolvimento Econômico Ardiano', party_legend: 'PDEA', party_number: 45, parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', party_color: '#352aad', parl_front_color: '#1d12b5' },
    { party_name: 'Partido Ecológico Nacional', party_legend: 'PECO', party_number: 50, parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', party_color: '#19cf7d', parl_front_color: '#19cf7d' },
    { party_name: 'Partido Monarquista', party_legend: 'PMONA', party_number: 65, parlamentar_front: 'Conservadores', parl_front_legend: 'CON', party_color: '#292929', parl_front_color: '#858483' }, // Ajustei 'Conservadores' para 'Frente Conservadora' se for o mesmo CON? Verifique. Se for diferente, mantenha.
    { party_name: 'Partido Operário Democrata', party_legend: 'PODE', party_number: 20, parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', party_color: '#cb52ff', parl_front_color: '#19cf7d' },
    { party_name: 'Partido da Social Democracia Ardiana', party_legend: 'PSD', party_number: 12, parlamentar_front: 'PSD', parl_front_legend: 'PSD', party_color: '#ff984a', parl_front_color: '#ff984a' },
    { party_name: 'Partido Socialista de Haagar', party_legend: 'PSH', party_number: 22, parlamentar_front: 'PSH', parl_front_legend: 'PSH', party_color: '#e80000', parl_front_color: '#e80000' },
    { party_name: 'Partido dos Trabalhadores', party_legend: 'PT', party_number: 13, parlamentar_front: 'Frente de Todos', parl_front_legend: 'TDS', party_color: '#c90000', parl_front_color: '#19cf7d' },
    { party_name: 'Movimento Unidos', party_legend: 'UNIDOS', party_number: 30, parlamentar_front: 'Unidos por Haagar', parl_front_legend: 'UNI', party_color: '#1d12b5', parl_front_color: '#1d12b5' }
  ];
  
  // Helper para converter string com ponto em número
  const parseNumber = (numStr: string | number | undefined | null): number => {
      if (typeof numStr === 'number') return numStr;
      if (typeof numStr === 'string') {
        // Remove pontos de milhar e substitui vírgula decimal por ponto (se houver)
        const cleanedStr = numStr.replace(/\./g, '').replace(',', '.');
        const num = parseFloat(cleanedStr);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };
  
  
  export const districtsData: DistrictInfoFromData[] = [
    { uf: 'TP', uf_name: 'Três Poderes', district_name: 'Cidade de Haagar', city_name: 'Cidade de Haagar', region_name: 'RAE dos Três Poderes', district_id: 101, population: parseNumber('214.523'), voters_qtn: parseNumber('150.166'), polls_qtn: parseNumber('301') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Monte Alegre', city_name: 'Monte Alegre', region_name: 'Metropolitana da Capital', district_id: 201, population: parseNumber('540.567'), voters_qtn: parseNumber('378.397'), polls_qtn: parseNumber('758') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Zona Leste', city_name: 'Monte Alegre', region_name: 'Metropolitana da Capital', district_id: 202, population: parseNumber('511.725'), voters_qtn: parseNumber('358.208'), polls_qtn: parseNumber('717') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Zona Oeste', city_name: 'Monte Alegre', region_name: 'Metropolitana da Capital', district_id: 203, population: parseNumber('479.856'), voters_qtn: parseNumber('335.899'), polls_qtn: parseNumber('673') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'São Pedro', city_name: 'São Pedro', region_name: 'Metropolitana de São Pedro', district_id: 204, population: parseNumber('456.988'), voters_qtn: parseNumber('319.892'), polls_qtn: parseNumber('641') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Porto', city_name: 'São Pedro', region_name: 'Metropolitana de São Pedro', district_id: 205, population: parseNumber('451.854'), voters_qtn: parseNumber('316.298'), polls_qtn: parseNumber('634') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Colinas', city_name: 'São Pedro', region_name: 'Metropolitana de São Pedro', district_id: 206, population: parseNumber('434.347'), voters_qtn: parseNumber('304.043'), polls_qtn: parseNumber('609') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Bela Vista', city_name: 'São Pedro', region_name: 'Metropolitana de São Pedro', district_id: 207, population: parseNumber('519.567'), voters_qtn: parseNumber('363.697'), polls_qtn: parseNumber('728') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Piratininga', city_name: 'Piratininga', region_name: 'Metropolitana de São Pedro', district_id: 208, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Lajeado de Piratininga', city_name: 'Piratininga', region_name: 'Metropolitana de São Pedro', district_id: 209, population: parseNumber('418.973'), voters_qtn: parseNumber('293.281'), polls_qtn: parseNumber('588') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'São Caetano', city_name: 'São Caetano', region_name: 'Metropolitana da Capital', district_id: 210, population: parseNumber('501.589'), voters_qtn: parseNumber('351.112'), polls_qtn: parseNumber('703') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Santo Antonio', city_name: 'São Caetano', region_name: 'Metropolitana da Capital', district_id: 211, population: parseNumber('544.276'), voters_qtn: parseNumber('380.993'), polls_qtn: parseNumber('763') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Vale dos Lagos', city_name: 'Vale dos Lagos', region_name: 'Região de Vale dos Lagos', district_id: 212, population: parseNumber('504.567'), voters_qtn: parseNumber('353.197'), polls_qtn: parseNumber('707') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Norte Vale dos Lagos', city_name: 'Vale dos Lagos', region_name: 'Região de Vale dos Lagos', district_id: 213, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Sul Vale dos Lagos', city_name: 'Vale dos Lagos', region_name: 'Região de Vale dos Lagos', district_id: 214, population: parseNumber('552.388'), voters_qtn: parseNumber('386.672'), polls_qtn: parseNumber('774') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Cibratel', city_name: 'Cibratel', region_name: 'Litoral Sul Monte Alegrense', district_id: 215, population: parseNumber('504.368'), voters_qtn: parseNumber('353.058'), polls_qtn: parseNumber('707') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Itororó', city_name: 'Cibratel', region_name: 'Litoral Sul Monte Alegrense', district_id: 216, population: parseNumber('501.975'), voters_qtn: parseNumber('351.383'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Itaicó', city_name: 'Itaicó', region_name: 'Litoral Sul Monte Alegrense', district_id: 217, population: parseNumber('521.678'), voters_qtn: parseNumber('365.175'), polls_qtn: parseNumber('731') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Ilha dos Fernandos', city_name: 'Itaicó', region_name: 'Litoral Sul Monte Alegrense', district_id: 218, population: parseNumber('559.678'), voters_qtn: parseNumber('391.775'), polls_qtn: parseNumber('785') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Cananéia', city_name: 'Cananéia', region_name: 'Metropolitana de São Pedro', district_id: 219, population: parseNumber('535.657'), voters_qtn: parseNumber('374.960'), polls_qtn: parseNumber('751') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Guararape', city_name: 'Guararape', region_name: 'Metropolitana de São Pedro', district_id: 220, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Betim', city_name: 'Betim', region_name: 'Metropolitana de São Pedro', district_id: 221, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Colombo', city_name: 'Colombo', region_name: 'Litoral Sul Monte Alegrense', district_id: 222, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Alvorada', city_name: 'Alvorada', region_name: 'Metropolitana da Capital', district_id: 223, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Rio Claro', city_name: 'Rio Claro', region_name: 'Metropolitana da Capital', district_id: 224, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Itapecerica', city_name: 'Itapecerica', region_name: 'Metropolitana da Capital', district_id: 225, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Teixeira', city_name: 'Teixeira', region_name: 'Região de Vale dos Lagos', district_id: 226, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Magnólias', city_name: 'Magnólias', region_name: 'Região de Vale dos Lagos', district_id: 227, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Lages', city_name: 'Várias', region_name: 'Região de Vale dos Lagos', district_id: 228, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Atibaia', city_name: 'Várias', region_name: 'Região de Atibaia', district_id: 229, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Itabaiana', city_name: 'Várias', region_name: 'Vale do Aço', district_id: 230, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Campo Largo e Marituba', city_name: 'Várias', region_name: 'Região de Atibaia', district_id: 231, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'São Félix e Cachoeirinha', city_name: 'Várias', region_name: 'Vale do Aço', district_id: 232, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Catanduva e Itatiba', city_name: 'Várias', region_name: 'Região de Catanduva', district_id: 233, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Campos Alegrenses', city_name: 'Várias', region_name: 'Campos Alegrenses', district_id: 234, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Açudes', city_name: 'Várias', region_name: 'Região de Açudes', district_id: 235, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Olaria, Extrema e Franco Montouro', city_name: 'Várias', region_name: 'Região de Açudes', district_id: 236, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Ribeirão Pires', city_name: 'Várias', region_name: 'Vale da Ribeira', district_id: 237, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Tatuí', city_name: 'Várias', region_name: 'Vale da Ribeira', district_id: 238, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Corumbina e Teresina', city_name: 'Várias', region_name: 'Vale da Ribeira', district_id: 239, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Borba Gato', city_name: 'Várias', region_name: 'Região de Borba Gato', district_id: 240, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Tucunaré e Socorro', city_name: 'Várias', region_name: 'Região de Borba Gato', district_id: 241, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Itaticoara', city_name: 'Várias', region_name: 'Região de Borba Gato', district_id: 242, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Garoupas', city_name: 'Várias', region_name: 'Região de Garoupas', district_id: 243, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Rio Velho Alegrense', city_name: 'Várias', region_name: 'Região de Garoupas', district_id: 244, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Araguari', city_name: 'Várias', region_name: 'Região de Garoupas', district_id: 245, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Poá', city_name: 'Várias', region_name: 'Região de Garoupas', district_id: 246, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Monte Alto', city_name: 'Várias', region_name: 'Serra do Rio Grande Alegrense', district_id: 247, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Vargem Grande Alegrense', city_name: 'Várias', region_name: 'Vargem Grande Alegrense', district_id: 248, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Borda do Campo', city_name: 'Várias', region_name: 'Serra do Rio Grande Alegrense', district_id: 249, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Serra do Cafezal', city_name: 'Várias', region_name: 'Serra do Cafezal', district_id: 250, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Reserva Florestal', city_name: 'Várias', region_name: 'Serra do Cafezal', district_id: 251, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MA', uf_name: 'Monte Alegre', district_name: 'Assis', city_name: 'Várias', region_name: 'Serra do Cafezal', district_id: 252, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'São Cristovam', city_name: 'São Cristovam', region_name: 'Metropolitana de São Cristovam', district_id: 301, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Pampulha', city_name: 'São Cristovam', region_name: 'Metropolitana de São Cristovam', district_id: 302, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Lourdes', city_name: 'São Cristovam', region_name: 'Metropolitana de São Cristovam', district_id: 303, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Paulo Afonso', city_name: 'Paulo Afonso', region_name: 'Metropolitana de São Cristovam', district_id: 304, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Santa Luzia', city_name: 'Santa Luzia', region_name: 'Metropolitana de São Cristovam', district_id: 305, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Contagem', city_name: 'Contagem', region_name: 'Metropolitana de São Cristovam', district_id: 306, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Serrana', city_name: 'Serrana', region_name: 'Metropolitana de São Cristovam', district_id: 307, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Serrana Norte', city_name: 'Serrana', region_name: 'Metropolitana de São Cristovam', district_id: 308, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Santo André de Serrana', city_name: 'Serrana', region_name: 'Metropolitana de São Cristovam', district_id: 309, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Tamandaré', city_name: 'Tamandaré', region_name: 'Região da Grande Tamandaré', district_id: 310, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Nações Catete e Xicrim', city_name: 'Nações Catete e Xicrim', region_name: 'RAE Catete e Xicrim', district_id: 311, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Nação Tucumã', city_name: 'Nação Tucumã', region_name: 'RAE Tucumã', district_id: 312, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Nação Mybia', city_name: 'Nação Mybia', region_name: 'RAE Mybia', district_id: 313, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Nação Parakanã', city_name: 'Nação Parakanã', region_name: 'RAE Parakanã', district_id: 314, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Maracajá', city_name: 'Maracajá', region_name: 'Região da Grande Tamandaré', district_id: 315, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Parintins', city_name: 'Parintins', region_name: 'Região da Grande Tamandaré', district_id: 316, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Senador Panedo', city_name: 'Senador Panedo', region_name: 'Baixada de Panedo', district_id: 317, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Areão e Tucuruí', city_name: 'Várias', region_name: 'Baixada de Panedo', district_id: 318, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Foz e Sutirí', city_name: 'Várias', region_name: 'Baixada de Panedo', district_id: 319, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'São Sebastião e Maresias', city_name: 'Várias', region_name: 'Baixada de Panedo', district_id: 320, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Tucuruí da Serra', city_name: 'Várias', region_name: 'Serra do Mato Alto', district_id: 321, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Serra do Mato Alto', city_name: 'Várias', region_name: 'Serra do Mato Alto', district_id: 322, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Vale do Jurubatuba', city_name: 'Várias', region_name: 'Serra do Mato Alto', district_id: 323, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Rio Grande', city_name: 'Várias', region_name: 'Serra do Rio Grande Manapeense', district_id: 324, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Guairá', city_name: 'Várias', region_name: 'Serra do Rio Grande Manapeense', district_id: 325, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Salesópolis', city_name: 'Várias', region_name: 'Serra do Rio Grande Manapeense', district_id: 326, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Altos de Tucuruí', city_name: 'Várias', region_name: 'Planato do Tucuruí', district_id: 327, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Salvador', city_name: 'Várias', region_name: 'Planato do Tucuruí', district_id: 328, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'São Benedito da Borda do Campo', city_name: 'Várias', region_name: 'Serra do Rio Grande Manapeense', district_id: 329, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'MP', uf_name: 'Manapê', district_name: 'Caiopó', city_name: 'Caiopó e Nação Caiopó', region_name: 'RAE Caiopó', district_id: 330, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Baía', city_name: 'Baía', region_name: 'Metropolitana da Baía', district_id: 401, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Barra', city_name: 'Baía', region_name: 'Metropolitana da Baía', district_id: 402, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Rochedo', city_name: 'Baía', region_name: 'Metropolitana da Baía', district_id: 403, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Araucárias', city_name: 'Araucárias', region_name: 'Metropolitana da Baía', district_id: 404, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Pinhal', city_name: 'Araucárias', region_name: 'Metropolitana da Baía', district_id: 405, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Suzano', city_name: 'Suzano', region_name: 'Metropolitana da Baía', district_id: 406, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Bom Retiro', city_name: 'Bom Retiro', region_name: 'Metropolitana da Baía', district_id: 407, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Águas Claras', city_name: 'Águas Claras', region_name: 'Metropolitana da Baía', district_id: 408, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Litoral Norte', city_name: 'Várias', region_name: 'Litoral Norte', district_id: 409, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Tríplice Fronteira', city_name: 'Várias', region_name: 'Litoral Norte', district_id: 410, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Garcia', city_name: 'Várias', region_name: 'Região de Garcia', district_id: 411, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Itajaí', city_name: 'Itajaí', region_name: 'Serra do Itajaí', district_id: 412, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Subida', city_name: 'Várias', region_name: 'Serra do Itajaí', district_id: 413, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Mirador', city_name: 'Várias', region_name: 'Serra do Itajaí', district_id: 414, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Umbú', city_name: 'Várias', region_name: 'Baixada de Umbú', district_id: 415, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'João Machado e Mirim', city_name: 'Várias', region_name: 'Baixada de Umbú', district_id: 416, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Itoupava e Indaia', city_name: 'Várias', region_name: 'Região de Itoupava', district_id: 417, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Nação Yamani', city_name: 'Nação Yamani', region_name: 'RAE Yamani', district_id: 418, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Campestre', city_name: 'Campestre', region_name: 'Serra do Rio Grande Baiense', district_id: 419, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Pedra Branca e Araraquara', city_name: 'Várias', region_name: 'Serra do Rio Grande Baiense', district_id: 420, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'BA', uf_name: 'Baía', district_name: 'Campo Alegre e Avencal', city_name: 'Várias', region_name: 'Serra do Rio Grande Baiense', district_id: 421, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Eufrates', city_name: 'Eufrates', region_name: 'Região Metropolitana de Eufrates', district_id: 501, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Asa Norte', city_name: 'Eufrates', region_name: 'Região Metropolitana de Eufrates', district_id: 502, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Asa Sul', city_name: 'Eufrates', region_name: 'Região Metropolitana de Eufrates', district_id: 503, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Arco Verde', city_name: 'Arco Verde', region_name: 'Região Metropolitana de Eufrates', district_id: 504, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Santa Rosa', city_name: 'Santa Rosa', region_name: 'Região Metropolitana de Eufrates', district_id: 505, population: parseNumber('514.378'), voters_qtn: parseNumber('360.065'), polls_qtn: parseNumber('721') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Palmeiras e Fátima', city_name: 'Várias', region_name: 'Região de São José', district_id: 506, population: parseNumber('526.945'), voters_qtn: parseNumber('368.862'), polls_qtn: parseNumber('739') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'São José', city_name: 'São José', region_name: 'Região de São José', district_id: 507, population: parseNumber('502.437'), voters_qtn: parseNumber('351.706'), polls_qtn: parseNumber('704') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Aquidabã e Aiurupu', city_name: 'Várias', region_name: 'Região de São José', district_id: 508, population: parseNumber('501.956'), voters_qtn: parseNumber('351.369'), polls_qtn: parseNumber('704') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Vale do Rio Vermelho', city_name: 'Várias', region_name: 'Vale do Rio Vermelho', district_id: 509, population: parseNumber('502.438'), voters_qtn: parseNumber('351.707'), polls_qtn: parseNumber('704') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Vale do Paraíba', city_name: 'Várias', region_name: 'Vale do Paraíba', district_id: 510, population: parseNumber('305.439'), voters_qtn: parseNumber('213.807'), polls_qtn: parseNumber('429') },
    { uf: 'PB', uf_name: 'Paraíba', district_name: 'Foz do Paraíba', city_name: 'Várias', region_name: 'Baixada Paraibana', district_id: 511, population: parseNumber('505.566'), voters_qtn: parseNumber('353.896'), polls_qtn: parseNumber('709') },
    { uf: 'PN', uf_name: 'Paraíba do Norte', district_name: 'Ourives Oeste', city_name: 'Ourives', region_name: 'Região Metropolitana de Ourives', district_id: 601, population: parseNumber('501.678'), voters_qtn: parseNumber('351.175'), polls_qtn: parseNumber('703') },
    { uf: 'PN', uf_name: 'Paraíba do Norte', district_name: 'Ourives Leste', city_name: 'Ourives', region_name: 'Região Metropolitana de Ourives', district_id: 602, population: parseNumber('503.254'), voters_qtn: parseNumber('352.278'), polls_qtn: parseNumber('706') },
    { uf: 'PN', uf_name: 'Paraíba do Norte', district_name: 'Grande Ourives', city_name: 'Várias', region_name: 'Região Metropolitana de Ourives', district_id: 603, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'PN', uf_name: 'Paraíba do Norte', district_name: 'Planalto do Paraíba', city_name: 'Várias', region_name: 'Planalto do Paraíba', district_id: 604, population: parseNumber('478.477'), voters_qtn: parseNumber('334.934'), polls_qtn: parseNumber('671') },
    { uf: 'PN', uf_name: 'Paraíba do Norte', district_name: 'Serra do Paraíba', city_name: 'Várias', region_name: 'Serra do Paraíba', district_id: 605, population: parseNumber('478.956'), voters_qtn: parseNumber('335.269'), polls_qtn: parseNumber('672') },
  ];

