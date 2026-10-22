import { CONTINENTS, TERRITORIES } from '../data/territories';
import { GameState } from './state';

export function calculateReinforcements(state: GameState, playerId: string): number {
  let count = 3; 
  const playerTerritories = Object.values(state.territories).filter((t) => t.ownerId === playerId);
  count = Math.max(3, Math.floor(playerTerritories.length / 3));

  for (const [contId, cont] of Object.entries(CONTINENTS)) {
    const contTerritories = TERRITORIES.filter((t) => t.continentId === contId);
    const ownsAll = contTerritories.every((t) => state.territories[t.id]?.ownerId === playerId);
    if (ownsAll) {
      count += cont.bonus;
    }
  }

  return count;
}