// ⚠️ DADOS DE VITRINE — nada aqui vem da API.
//
// As telas do Stitch mostram distância até a arena, comodidades e mapa. O backend
// ainda não tem esses campos (nem lat/lng, nem lista de comodidades) e não há
// permissão de localização no app. Em vez de espalhar valores inventados pelas
// telas, tudo fica isolado neste arquivo: quando os dados reais existirem, é só
// trocar cada função por uma leitura do objeto da arena e apagar o arquivo.
//
// TODO(backend): distância real = lat/lng na Arena + expo-location no cliente.
// TODO(backend): comodidades reais = campo `amenities` (csv) na Arena + seed.

/** Hash estável de string → inteiro. Mesma arena, mesmo número, sempre. */
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/**
 * Distância de vitrine, em km. Determinística por arena — não muda entre renders
 * nem entre telas, então a home e a busca mostram o mesmo valor pra mesma arena.
 * TODO: trocar por distância real quando houver lat/lng + GPS.
 */
export function mockDistanceKm(arenaId: string): number {
  return Math.round((0.4 + (hash(arenaId) % 92) / 10) * 10) / 10;
}

/** "2,4 km" no formato pt-BR. */
export function mockDistanceLabel(arenaId: string): string {
  return `${mockDistanceKm(arenaId).toFixed(1).replace('.', ',')} km`;
}

export type AmenityKey = 'parking' | 'lockers' | 'bar' | 'wifi';

/**
 * Comodidades de vitrine — hoje idênticas para toda arena, como nas telas do Stitch.
 * TODO: trocar por `arena.amenities` quando o campo existir.
 */
export const MOCK_AMENITIES: { key: AmenityKey; label: string }[] = [
  { key: 'parking', label: 'Estacionamento' },
  { key: 'lockers', label: 'Vestiário' },
  { key: 'bar', label: 'Bar' },
  { key: 'wifi', label: 'Wi-Fi' },
];
