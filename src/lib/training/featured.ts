import type { SessionWithSeats } from './types';

/** Session à mettre en avant pour une formation : la prochaine ouverte/à venir, sinon la plus récente. */
export function featuredSession(sessions: SessionWithSeats[]): SessionWithSeats | null {
  if (sessions.length === 0) return null;
  const rank = (s: SessionWithSeats) => ({ OUVERT: 0, EN_COURS: 1, BIENTOT: 2, FERME: 3, TERMINEE: 4, ANNULEE: 5, BROUILLON: 6 }[s.status] ?? 9);
  return [...sessions].sort((a, b) => rank(a) - rank(b) || (rank(a) >= 4 ? b.starts_on.localeCompare(a.starts_on) : a.starts_on.localeCompare(b.starts_on)))[0];
}

