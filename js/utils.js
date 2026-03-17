export function getTierName(level) {
  if (level <= 0) return 'Unrated';
  const tiers = ['B', 'S', 'G', 'P', 'D', 'R'];
  const group = Math.floor((level - 1) / 5);
  const rank = 5 - ((level - 1) % 5);
  const tierLabel = tiers[group] || 'M';
  return `${tierLabel}${rank}`;
}