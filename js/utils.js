export function getTierName(t) {
  const letters = ['', 'B', 'S', 'G', 'P', 'D', 'R'];
  if (t == 0) return 'Unrated';
  
  const group = letters[Math.floor((t - 1) / 5) + 1];
  const level = 5 - ((t - 1) % 5);
  return `${group}${level}`;
}