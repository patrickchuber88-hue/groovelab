import { useState, useCallback, useEffect } from 'react';
import JSZip from 'jszip';
import { getBlob } from '../../../../utils/blobStorage';

interface UseAudioSharingProps {
  studentId: string;
  studentName?: string;
  schoolName?: string;
}

export function useAudioSharing(
  propsOrStudent: UseAudioSharingProps | any,
  maybeStudentId?: string,
  _customPlaylists?: any,
  _milestones?: any
) {
  const studentId = (propsOrStudent && typeof propsOrStudent === 'object' && 'studentId' in propsOrStudent && propsOrStudent.studentId)
    ? propsOrStudent.studentId
    : (maybeStudentId || propsOrStudent?.id || propsOrStudent?.student_id || 'anonymous_student');
  const studentName = (propsOrStudent && typeof propsOrStudent === 'object' && 'studentName' in propsOrStudent)
    ? propsOrStudent.studentName
    : (propsOrStudent?.first_name || 'Schüler');
  const schoolName = (propsOrStudent && typeof propsOrStudent === 'object' && 'schoolName' in propsOrStudent)
    ? propsOrStudent.schoolName
    : (propsOrStudent?.school_name || 'Campus-Groovelab');

  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareAnonymously, setShareAnonymously] = useState<boolean>(false);
  const [shareAllowApplause, setShareAllowApplause] = useState<boolean>(true);
  const [shareTargetPlaylistId, setShareTargetPlaylistId] = useState<string | null>(null);
  const [shareDesignTheme, setShareDesignTheme] = useState<'dark' | 'light'>('dark');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [showShareMessagePreview, setShowShareMessagePreview] = useState<boolean>(false);
  const [isZipExporting, setIsZipExporting] = useState<boolean>(false);
  const [zipProgressText, setZipProgressText] = useState<string>('');

  const getOrInitStableSharePin = useCallback((id: string, plId?: string | null): string => {
    try {
      if (plId) {
        const plStored = localStorage.getItem(`campus_share_pin_${id}_${plId}`);
        if (plStored && /^\d{4}$/.test(plStored)) return plStored;
      }
      const stored = localStorage.getItem(`campus_share_pin_${id}`);
      if (stored && /^\d{4}$/.test(stored)) return stored;

      const currentStored = localStorage.getItem('campus_share_pin_current');
      if (currentStored && /^\d{4}$/.test(currentStored)) return currentStored;

      let randomPin = '4829';
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const randomValues = new Uint32Array(1);
        window.crypto.getRandomValues(randomValues);
        randomPin = (1000 + (randomValues[0] % 9000)).toString();
      } else {
        randomPin = Math.floor(1000 + Math.random() * 9000).toString();
      }

      localStorage.setItem(`campus_share_pin_${id}`, randomPin);
      localStorage.setItem('campus_share_pin_current', randomPin);
      localStorage.setItem('campus_share_pin_global', randomPin);
      return randomPin;
    } catch {
      return '4829';
    }
  }, []);

  const [sharePin, setSharePin] = useState<string>(() => getOrInitStableSharePin(studentId));

  useEffect(() => {
    if (studentId) {
      const pin = getOrInitStableSharePin(studentId, shareTargetPlaylistId);
      setSharePin(pin);
    }
  }, [studentId, shareTargetPlaylistId, getOrInitStableSharePin]);

  const savePinToStorage = useCallback((newPin: string) => {
    setSharePin(newPin);
    try {
      if (studentId) {
        localStorage.setItem(`campus_share_pin_${studentId}`, newPin);
        if (shareTargetPlaylistId) {
          localStorage.setItem(`campus_share_pin_${studentId}_${shareTargetPlaylistId}`, newPin);
        }
      }
      localStorage.setItem('campus_share_pin_current', newPin);
      localStorage.setItem('campus_share_pin_global', newPin);
    } catch (e) {
      console.warn('Could not save PIN to storage:', e);
    }
  }, [studentId, shareTargetPlaylistId]);

  const reRollPin = useCallback(() => {
    let newPin = '1234';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const randomValues = new Uint32Array(1);
      window.crypto.getRandomValues(randomValues);
      newPin = (1000 + (randomValues[0] % 9000)).toString();
    } else {
      newPin = Math.floor(1000 + Math.random() * 9000).toString();
    }
    savePinToStorage(newPin);
  }, [savePinToStorage]);

  const buildShareUrl = useCallback((): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const params = new URLSearchParams();
    params.set('share', 'audio_bio');
    params.set('student', studentId);
    if (shareTargetPlaylistId) params.set('playlist', shareTargetPlaylistId);
    if (shareAnonymously) params.set('anon', '1');
    return `${origin}/campus/share?${params.toString()}`;
  }, [studentId, shareTargetPlaylistId, shareAnonymously]);

  const copyShareLink = useCallback(async () => {
    const url = buildShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  }, [buildShareUrl]);

  const copyToClipboard = useCallback((text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(console.warn);
    }
  }, []);

  const createTrackZipArchive = useCallback(async (track: {
    id: string;
    title: string;
    artist?: string;
    personalNote?: string;
    audioUrl?: string;
    masteredAudioUrl?: string;
  }) => {
    const zip = new JSZip();
    const folderName = `${track.title.replace(/[/\\?%*:|"<>]/g, '_')}`;
    const folder = zip.folder(folderName) || zip;

    // Fetch master blob
    let masterBlob = await getBlob(`campus_audio_${track.id}_master`);
    if (!masterBlob && track.masteredAudioUrl) {
      try {
        const resp = await fetch(track.masteredAudioUrl);
        masterBlob = await resp.blob();
      } catch (e) {
        console.warn('Could not fetch remote master:', e);
      }
    }
    if (masterBlob) {
      folder.file(`${folderName}_Studio_Master.wav`, masterBlob);
    }

    // Fetch raw blob
    let rawBlob = await getBlob(`campus_audio_${track.id}_raw`);
    if (!rawBlob && track.audioUrl) {
      try {
        const resp = await fetch(track.audioUrl);
        rawBlob = await resp.blob();
      } catch (e) {
        console.warn('Could not fetch remote raw:', e);
      }
    }
    if (rawBlob) {
      folder.file(`${folderName}_Pure_RAW.wav`, rawBlob);
    }

    // Add info note
    const metaText = `Campus-Groovelab Audio Portfolio\n=================================\nTitel: ${track.title}\nSchüler: ${studentName || 'Schüler'}\nMusikschule: ${schoolName || 'Campus-Groovelab'}\nDatum: ${new Date().toLocaleDateString('de-DE')}\nNotiz: ${track.personalNote || 'Keine persönliche Notiz hinterlegt.'}\n`;
    folder.file('Track_Info.txt', metaText);

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const downloadUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${folderName}_AudioPaket.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  }, [studentName, schoolName]);

  const downloadAllTracksAsZip = useCallback(async (tracksToExport?: Array<{
    id: string;
    title: string;
    artist?: string;
    audioUrl?: string;
    masteredAudioUrl?: string;
    personalNote?: string;
  }>) => {
    setIsZipExporting(true);
    setZipProgressText('Archiv wird vorbereitet...');
    try {
      const zip = new JSZip();
      const folder = zip.folder(`Campus_AudioArchiv_${studentName || 'Schueler'}`) || zip;

      const tracks = tracksToExport || [];
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        setZipProgressText(`Track ${i + 1}/${tracks.length}: ${t.title}`);
        const safeTitle = t.title.replace(/[/\\?%*:|"<>]/g, '_');

        let masterBlob = await getBlob(`campus_audio_${t.id}_master`);
        if (!masterBlob && t.masteredAudioUrl) {
          try {
            const resp = await fetch(t.masteredAudioUrl);
            masterBlob = await resp.blob();
          } catch {}
        }
        if (masterBlob) {
          folder.file(`${String(i + 1).padStart(2, '0')}_${safeTitle}_Studio_Master.wav`, masterBlob);
        }

        let rawBlob = await getBlob(`campus_audio_${t.id}_raw`);
        if (!rawBlob && t.audioUrl) {
          try {
            const resp = await fetch(t.audioUrl);
            rawBlob = await resp.blob();
          } catch {}
        }
        if (rawBlob) {
          folder.file(`${String(i + 1).padStart(2, '0')}_${safeTitle}_Pure_RAW.wav`, rawBlob);
        }
      }

      setZipProgressText('ZIP-Datei wird komprimiert...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AudioPortfolio_${studentName || 'Schueler'}_AlleSpuren.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Zip export failed:', err);
    } finally {
      setIsZipExporting(false);
      setZipProgressText('');
    }
  }, [studentName]);

  return {
    showShareModal,
    setShowShareModal,
    sharePin,
    setSharePin: savePinToStorage,
    reRollPin,
    shareAnonymously,
    setShareAnonymously,
    shareAllowApplause,
    setShareAllowApplause,
    shareTargetPlaylistId,
    setShareTargetPlaylistId,
    shareDesignTheme,
    setShareDesignTheme,
    copySuccess,
    copyShareLink,
    showShareMessagePreview,
    setShowShareMessagePreview,
    buildShareUrl,
    createTrackZipArchive,
    downloadAllTracksAsZip,
    isZipExporting,
    zipProgressText,
    copyToClipboard
  };
}
