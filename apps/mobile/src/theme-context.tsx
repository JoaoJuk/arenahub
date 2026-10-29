import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palettes, type Colors, type ThemeMode } from './theme';

const KEY = 'liggo:theme';

type Ctx = {
  /** Tema em uso agora. */
  mode: ThemeMode;
  colors: Colors;
  /** `true` quando o app está seguindo o tema do sistema (nunca foi trocado à mão). */
  followsSystem: boolean;
  setMode: (m: ThemeMode) => void;
  /** Volta a acompanhar o aparelho. */
  followSystem: () => void;
};

const ThemeCtx = createContext<Ctx>({
  mode: 'light',
  colors: palettes.light,
  followsSystem: true,
  setMode: () => {},
  followSystem: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  // `null` = ainda não escolheu nada, então manda o sistema. Guardar a ausência
  // de escolha (em vez de gravar 'light' na primeira abertura) é o que permite o
  // app acompanhar o aparelho de quem nunca abriu Configurações.
  const [stored, setStored] = useState<ThemeMode | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => { if (v === 'light' || v === 'dark') setStored(v); })
      .catch(() => {})
      .finally(() => setHydrated(true));
  }, []);

  const mode: ThemeMode = stored ?? (system === 'dark' ? 'dark' : 'light');

  const setMode = useCallback((m: ThemeMode) => {
    setStored(m);
    AsyncStorage.setItem(KEY, m).catch(() => {});
  }, []);

  const followSystem = useCallback(() => {
    setStored(null);
    AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  const value = useMemo<Ctx>(
    () => ({ mode, colors: palettes[mode], followsSystem: stored === null, setMode, followSystem }),
    [mode, stored, setMode, followSystem],
  );

  // Enquanto a preferência não voltou do disco não renderiza: sem isso o app
  // pisca no tema errado por um frame ao abrir.
  if (!hydrated) return null;

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/** A paleta ativa. É o hook que 99% das telas usam. */
export const useColors = (): Colors => useContext(ThemeCtx).colors;

/** Modo atual + como trocá-lo. Só a tela de Configurações precisa disto. */
export const useThemeMode = (): Ctx => useContext(ThemeCtx);

/**
 * Cria o StyleSheet a partir da paleta ativa e o recria só quando o tema muda.
 *
 * `StyleSheet.create` no escopo do módulo congelaria as cores no primeiro import
 * e a troca de tema não teria efeito nenhum — por isso toda folha de estilo do
 * app virou uma factory que recebe as cores.
 */
export function useStyles<T>(factory: (c: Colors) => T): T {
  const colors = useColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
