export function resolveCombat(attackerArmies: number, defenderArmies: number) {
  const numAttackerDice = Math.min(3, attackerArmies - 1);
  const numDefenderDice = Math.min(2, defenderArmies);

  const attackerRolls = Array.from({ length: numAttackerDice }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);
  const defenderRolls = Array.from({ length: numDefenderDice }, () => Math.floor(Math.random() * 6) + 1).sort((a, b) => b - a);

  let attackerLosses = 0;
  let defenderLosses = 0;

  for (let i = 0; i < Math.min(attackerRolls.length, defenderRolls.length); i++) {
    if (attackerRolls[i] > defenderRolls[i]) {
      defenderLosses++;
    } else {
      attackerLosses++; // تساوی به نفع مدافع در قوانین کلاسیک ریسک
    }
  }

  return { attackerLosses, defenderLosses, attackerRolls, defenderRolls };
}