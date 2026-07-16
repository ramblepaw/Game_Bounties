/** Case- and diacritic-insensitive, so "pokemon" matches "Pokémon Red Version". */
export function normalizeForSearch(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
