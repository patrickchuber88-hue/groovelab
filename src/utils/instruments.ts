export const normalizeInstrument = (name: string): string => {
  if (!name) return "";
  const n = (name || "").toLowerCase().trim();
  if (n.includes('guitar') || n.includes('gitarre')) return 'E-Gitarre';
  if (n.includes('bass')) return 'E-Bass';
  if (n.includes('drum') || n.includes('schlagzeug')) return 'E-Drums';
  if (n.includes('vocals') || n.includes('gesang') || n.includes('stimme')) return 'Vocals';
  if (n.includes('piano') || n.includes('keys') || n.includes('klavier') || n.includes('e-piano')) return 'E-Piano';
  return name;
};
