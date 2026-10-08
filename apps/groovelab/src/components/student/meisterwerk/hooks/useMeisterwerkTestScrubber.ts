import { useEffect } from 'react';
import { isDummyOrTestSong } from '../utils/meisterwerkSongHelpers';

/**
 * 🛡️ 0.1% Goldstandard Sanitizer Hook: Client-Side Scrubber für Test- und Dummy-Song-Reste
 * Bereinigt temporäre _test-Keys und Dummy-Songs im localStorage, um Daten-Drift zu verhindern.
 */
export function useMeisterwerkTestScrubber(studentId?: string | null) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (
          k.toLowerCase().includes('_test') ||
          k.startsWith('song_hw_test') ||
          k.startsWith('song_note_test') ||
          (studentId && (k === `song_hw_${studentId}_test` || k === `song_note_${studentId}_test`))
        ) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));

      // campus_user_song_skills säubern falls Dummy-Song vorhanden
      const storedSkillsRaw = localStorage.getItem('campus_user_song_skills');
      if (storedSkillsRaw) {
        try {
          const skills = JSON.parse(storedSkillsRaw);
          if (Array.isArray(skills)) {
            const sanitized = skills.filter((s: any) => !isDummyOrTestSong(s) && !isDummyOrTestSong(s?.songs));
            if (sanitized.length !== skills.length) {
              localStorage.setItem('campus_user_song_skills', JSON.stringify(sanitized));
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }, [studentId]);
}
