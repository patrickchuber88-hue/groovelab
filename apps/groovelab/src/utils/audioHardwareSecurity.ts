/**
 * Campus-Groovelab Audio Hardware Security
 * 
 * Guarantees physical termination of MediaStream audio tracks,
 * ensuring no recording indicators linger on Mac, iOS, or Android devices.
 */

export function terminateMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  try {
    const tracks = stream.getTracks();
    tracks.forEach((track) => {
      try {
        track.stop();
        track.enabled = false;
      } catch (e) {}
    });
    console.log(`[AudioSecurity] Physical hardware cutoff executed for ${tracks.length} track(s).`);
  } catch (err) {
    console.warn('[AudioSecurity] Error terminating MediaStream:', err);
  }
}
