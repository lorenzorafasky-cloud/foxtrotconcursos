export const rankTable = [
  { name: "Recruta", min: 0 },
  { name: "Soldado", min: 250 },
  { name: "Cabo", min: 700 },
  { name: "Sargento", min: 1500 },
  { name: "Tenente", min: 3000 },
  { name: "Capitao", min: 5500 },
  { name: "Major", min: 9000 },
  { name: "Coronel", min: 14000 }
] as const;

export type RankName = (typeof rankTable)[number]["name"];

export function rankForXp(xp: number) {
  return rankTable.reduce<RankName>((current, rank) => (xp >= rank.min ? rank.name : current), rankTable[0].name);
}
