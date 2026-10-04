// lib/haagar2026/names.ts
// Nomes fictícios para candidatos novos de 2026.
import { Rng, pick } from './random';

const FIRST_F = [
  'Ana', 'Beatriz', 'Camila', 'Carla', 'Clara', 'Daniela', 'Elisa', 'Fernanda', 'Gabriela', 'Helena',
  'Isabela', 'Joana', 'Júlia', 'Larissa', 'Lívia', 'Luana', 'Marina', 'Natália', 'Patrícia', 'Raquel',
  'Renata', 'Sofia', 'Tânia', 'Valéria', 'Yasmin',
];
const FIRST_M = [
  'Adriano', 'André', 'Bruno', 'Caio', 'César',
  'Diego', 'Eduardo', 'Fábio', 'Felipe', 'Gustavo', 'Heitor', 'Igor', 'João', 'Leonardo', 'Lucas',
  'Marcelo', 'Mateus', 'Otávio', 'Paulo', 'Rafael', 'Renan', 'Rodrigo', 'Samuel', 'Thiago', 'Vítor',
];
const LAST = [
  'Almeida', 'Andrade', 'Barbosa', 'Barros', 'Cardoso', 'Carvalho', 'Castro', 'Correia', 'Costa', 'Cunha',
  'Dias', 'Duarte', 'Farias', 'Ferraz', 'Freitas', 'Gomes', 'Lacerda', 'Lima', 'Macedo', 'Machado',
  'Martins', 'Medeiros', 'Mendes', 'Monteiro', 'Moraes', 'Moreira', 'Nogueira', 'Novaes', 'Pacheco', 'Peixoto',
  'Pereira', 'Pinheiro', 'Prado', 'Queiroz', 'Ramos', 'Rezende', 'Ribeiro', 'Rocha', 'Sampaio', 'Siqueira',
  'Tavares', 'Teixeira', 'Valadares', 'Vasconcelos', 'Viana', 'Vieira', 'Xavier', 'Haag', 'Ardian', 'Montealvo',
];

export type Gender = 'F' | 'M';

/** Nome fictício; com gênero informado, o primeiro nome é coerente com ele. */
export function fictionalName(r: Rng, gender?: Gender | null): string {
  const g: Gender = gender ?? (r() < 0.45 ? 'F' : 'M');
  const first = pick(r, g === 'F' ? FIRST_F : FIRST_M);
  const last1 = pick(r, LAST);
  if (r() < 0.35) {
    let last2 = pick(r, LAST);
    if (last2 === last1) last2 = pick(r, LAST);
    return `${first} ${last1} ${last2}`;
  }
  return `${first} ${last1}`;
}
