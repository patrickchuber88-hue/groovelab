import { createZipArchive, triggerDownload, ZipFileInput } from './zipHelper';
import { supabase } from '../lib/supabase';

export interface StudentAudioBackupOptions {
  studentId: string;
  studentName?: string;
}

/**
 * Collects all student audio recordings and exports a structured multi-folder ZIP archive
 */
export async function downloadStudentAudioBackup({
  studentId,
  studentName = 'Schueler'
}: StudentAudioBackupOptions): Promise<{ count: number; zipSize: number }> {
  const files: ZipFileInput[] = [];
  const cleanStudentName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Helper to fetch audio blob from URL
  const fetchAudioBytes = async (url: string): Promise<Uint8Array | null> => {
    try {
      if (url.startsWith('data:')) {
        const base64 = url.split(',')[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      }
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      return new Uint8Array(buf);
    } catch (e) {
      console.warn('[AudioBackup] Fetch error for', url, e);
      return null;
    }
  };

  // 1. Loopstation Loops from LocalStorage
  try {
    const loopKeys = [`campus_saved_loops_${studentId}`, `groovelab_saved_loops_${studentId}`, `saved_loops_${studentId}`];
    for (const key of loopKeys) {
      const stored = localStorage.getItem(key);
      if (stored) {
        const loops = JSON.parse(stored);
        if (Array.isArray(loops)) {
          for (let i = 0; i < loops.length; i++) {
            const loop = loops[i];
            const title = (loop.title || loop.name || `Loop_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
            const audioUrl = loop.audio_url || loop.url || loop.dataUrl || loop.blobUrl;
            if (audioUrl) {
              const bytes = await fetchAudioBytes(audioUrl);
              if (bytes) {
                const ext = loop.format || 'mp3';
                files.push({
                  name: `Loopstation/${title}.${ext}`,
                  data: bytes
                });
              }
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[AudioBackup] Loopstation backup error:', e);
  }

  // 2. Junior Self-Recordings & Homework Notes
  try {
    const juniorStored = localStorage.getItem(`campus_junior_recordings_${studentId}`);
    if (juniorStored) {
      const recs = JSON.parse(juniorStored);
      if (Array.isArray(recs)) {
        for (let i = 0; i < recs.length; i++) {
          const r = recs[i];
          const title = (r.title || r.label || `Aufnahme_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
          const audioUrl = r.url || r.audio_url || r.dataUrl;
          if (audioUrl) {
            const bytes = await fetchAudioBytes(audioUrl);
            if (bytes) {
              files.push({
                name: `Hausaufgaben/${title}.wav`,
                data: bytes
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.warn('[AudioBackup] Junior recordings error:', e);
  }

  // 3. Meisterwerke & Audio-Biografie from Supabase / Local Storage
  try {
    const bioStored = localStorage.getItem(`campus_audio_biography_${studentId}`);
    if (bioStored) {
      const bio = JSON.parse(bioStored);
      if (Array.isArray(bio)) {
        for (let i = 0; i < bio.length; i++) {
          const item = bio[i];
          const title = (item.title || item.song_title || `Meilenstein_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
          const audioUrl = item.audio_url || item.url;
          if (audioUrl) {
            const bytes = await fetchAudioBytes(audioUrl);
            if (bytes) {
              files.push({
                name: `Meisterwerke/${title}.wav`,
                data: bytes
              });
            }
          }
        }
      }
    }

    // Also check Supabase user_song_skills
    const { data: skills } = await supabase
      .from('user_song_skills')
      .select('audio_url, songs(title)')
      .eq('user_id', studentId);
    
    if (skills) {
      for (const s of skills) {
        if (s.audio_url) {
          const songTitle = ((s as any)?.songs?.title || 'Song').replace(/[^a-zA-Z0-9_-]/g, '_');
          const bytes = await fetchAudioBytes(s.audio_url);
          if (bytes) {
            files.push({
              name: `Meisterwerke/${songTitle}.wav`,
              data: bytes
            });
          }
        }
      }
    }
  } catch (e) {
    console.warn('[AudioBackup] Audio biography error:', e);
  }

  // 4. Fallback Info File if no audio files were present
  const summaryContent = `Campus-Groovelab Audio-Tresor Archiv
Schüler: ${studentName} (ID: ${studentId})
Erstellt am: ${new Date().toLocaleString('de-DE')}

Enthaltene Aufnahmen: ${files.length}
Ordner-Struktur:
- /Meisterwerke (Konzerte, Meilensteine & Audio-Biografie)
- /Loopstation (Eigene Beats & Jam-Tracks)
- /Hausaufgaben (Unterrichts- & Selbstaufnahmen)
`;

  files.push({
    name: 'README_Audio_Archiv.txt',
    data: summaryContent
  });

  const zipBlob = createZipArchive(files);
  const filename = `Campus_Groovelab_Audio_Archiv_${cleanStudentName}_${new Date().toISOString().slice(0, 10)}.zip`;
  triggerDownload(zipBlob, filename);

  // Mark as backed up in localStorage
  localStorage.setItem(`campus_storage_backup_downloaded_${studentId}`, 'true');
  localStorage.setItem(`campus_storage_backup_timestamp_${studentId}`, new Date().toISOString());

  return {
    count: files.length - 1, // minus README
    zipSize: zipBlob.size
  };
}
