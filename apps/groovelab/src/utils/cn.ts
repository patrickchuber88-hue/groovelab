/**
 * Lightweight Tailwind CSS Class Merge Utility (Zero-Dependency)
 * Safely joins class names and deduplicates basic padding/margin/bg classes
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  const merged = classes.filter(Boolean).join(' ').split(' ').filter(Boolean);
  
  // Basic LIFO overriding for Tailwind utility prefixes (px-, py-, bg-, text-)
  const prefixMap = new Map<string, string>();
  const out: string[] = [];
  
  for (const cls of merged) {
    let handled = false;
    const overrides = ['px-', 'py-', 'p-', 'mx-', 'my-', 'm-', 'bg-', 'text-', 'rounded-'];
    for (const prefix of overrides) {
      if (cls.startsWith(prefix) && !cls.includes(':')) {
        prefixMap.set(prefix, cls);
        handled = true;
        break;
      }
    }
    if (!handled) {
      out.push(cls);
    }
  }

  // Append the winning override classes
  for (const [, cls] of prefixMap.entries()) {
    out.push(cls);
  }

  return out.join(' ');
}
