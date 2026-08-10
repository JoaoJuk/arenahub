import React from 'react';
import { Volleyball, Goal, Target, Dumbbell, CircleDot } from 'lucide-react-native';

/**
 * Ícone do esporte. Emoji está proibido nas telas do jogador (DESIGN.md §7), então
 * cada modalidade do seed mapeia para um ícone Lucide. Desconhecido cai em CircleDot.
 */
export function sportIcon(sport: string | undefined | null) {
  const s = (sport || '').toLowerCase();
  if (s.includes('vôlei') || s.includes('volei') || s.includes('beach')) return Volleyball;
  if (s.includes('futebol') || s.includes('society') || s.includes('futsal') || s.includes('fut')) return Goal;
  if (s.includes('tennis') || s.includes('tênis') || s.includes('padel')) return Target;
  if (s.includes('basquete') || s.includes('basket')) return Dumbbell;
  return CircleDot;
}

type Props = { sport?: string | null; color: string; size?: number };

export const SportIcon: React.FC<Props> = ({ sport, color, size = 20 }) => {
  const Icon = sportIcon(sport);
  return <Icon color={color} size={size} />;
};
