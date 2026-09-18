/**
 * Utility functions for secretary dashboard schedule and room formatting.
 */

export function checkTimeOverlap(t1Start: string, t1End: string, t2Start: string, t2End: string): boolean {
  if (!t1Start || !t1End || !t2Start || !t2End) return false;
  return t1Start < t2End && t2Start < t1End;
}

export function formatInstrumentName(name: string): string {
  if (!name) return '';
  const mapping: Record<string, string> = {
    akustisches_klavier: 'Akustisches Klavier',
    ensemble_geeignet: 'Ensembles/Bands',
    ensembles_geeignet: 'Ensembles/Bands',
    e_piano: 'E-Piano',
    e_gitarre: 'E-Gitarre',
    akustische_gitarre: 'Akustische Gitarre',
    schlagzeug: 'Schlagzeug',
    piano: 'Piano',
    gitarre: 'Gitarre',
    gesang: 'Gesang',
    geige: 'Geige',
    querfloete: 'Querflöte',
    blockfloete: 'Blockflöte',
    saxophon: 'Saxophon',
    bass: 'Bass',
    keyboard: 'Keyboard',
    trompete: 'Trompete',
    blaeser: 'Bläser',
    tasteninstrumente: 'Tasteninstrumente',
    saiteninstrumente: 'Saiteninstrumente',
    blasinstrumente: 'Blasinstrumente',
    percussion: 'Percussion'
  };

  const key = name.toLowerCase().trim();
  if (mapping[key]) return mapping[key];

  return name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
