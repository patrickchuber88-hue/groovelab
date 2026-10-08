/**
 * 📷 Global Camera Kill Switch
 * Guarantees that any third-party scanner library (like react-qr-scanner)
 * cannot keep the camera active after the user has logged in or left the page.
 */
export function initGlobalCameraKillSwitch(): void {
  if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    if (!(window as any)._cameraPatched) {
      (window as any)._cameraPatched = true;
      (window as any)._activeMediaStreams = [];
      
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await originalGetUserMedia(constraints);
        (window as any)._activeMediaStreams.push(stream);
        stream.getTracks().forEach(track => {
          track.addEventListener('ended', () => {
            if ((window as any)._activeMediaStreams) {
              (window as any)._activeMediaStreams = (window as any)._activeMediaStreams.filter((s: MediaStream) => s.active && s !== stream);
            }
          }, { once: true });
        });
        return stream;
      };
      
      (window as any).stopAllCameras = () => {
        if ((window as any)._activeMediaStreams) {
          (window as any)._activeMediaStreams.forEach((stream: MediaStream) => {
            // 📷 0,1% Goldstandard: Stoppt strikt und ausnahmslos VIDEO-Tracks (QR-Scanner / Kamera)!
            // Audio-Tracks (Mikrofon, Stimmgerät, Loopstation) bleiben 100% geschützt und aktiv!
            stream.getVideoTracks().forEach(track => {
              try {
                track.stop();
                stream.removeTrack(track);
              } catch (_) {}
            });
          });
          // Behalte Streams, die weiterhin aktive Audio-Tracks haben
          (window as any)._activeMediaStreams = (window as any)._activeMediaStreams.filter(
            (stream: MediaStream) => stream.active && stream.getAudioTracks().length > 0
          );
        }
      };

      window.addEventListener('beforeunload', () => {
        (window as any).stopAllCameras();
      });
      window.addEventListener('pagehide', () => {
        (window as any).stopAllCameras();
      });
    }
  }
}

export function stopAllCameras(): void {
  if (typeof window !== 'undefined' && typeof (window as any).stopAllCameras === 'function') {
    (window as any).stopAllCameras();
  }
}
