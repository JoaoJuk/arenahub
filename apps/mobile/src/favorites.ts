import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Favoritos ficam no dispositivo, não no servidor — não existe endpoint de
// favoritos ainda. É uma store minúscula em vez de estado local de tela porque
// três telas precisam do mesmo dado: a busca e a arena marcam, a home lê.
// TODO(backend): sincronizar com /users/me/favorites quando existir; o formato
// (array de arenaId) já é o que a API deveria devolver.
const KEY = 'liggo:favorites';

let ids: string[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

// Hidrata uma vez, no primeiro import. Enquanto não volta do disco a lista fica
// vazia — é meio segundo sem coração aceso, preferível a bloquear a home.
AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (raw) ids = JSON.parse(raw);
  })
  .catch(() => {})
  .finally(() => { hydrated = true; emit(); });

const persist = () => { AsyncStorage.setItem(KEY, JSON.stringify(ids)).catch(() => {}); };

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Lista de arenas favoritas, na ordem em que foram marcadas. */
export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, () => ids, () => ids);
}

export function useIsFavorite(arenaId: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ids.includes(arenaId),
    () => false,
  );
}

export function toggleFavorite(arenaId: string) {
  // Novo favorito entra no fim: a lista da home fica na ordem em que o usuário
  // foi marcando, que é mais previsível do que reordenar por qualquer critério.
  ids = ids.includes(arenaId) ? ids.filter((x) => x !== arenaId) : [...ids, arenaId];
  persist();
  emit();
}

export const favoritesHydrated = () => hydrated;
