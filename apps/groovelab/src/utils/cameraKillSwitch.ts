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
            stream.getTracks().forEach(track => {
              track.stop();
              stream.removeTrack(track);
            });
          });
          (window as any)._activeMediaStreams = [];
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
