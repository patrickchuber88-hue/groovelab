/**
 * 🎧 AUDIO TAIL ENGINE & MUSICAL RELEASE PROCESSOR
 * 
 * 0,1% DAW Goldstandard (Ableton Live / Logic Pro Parität):
 * Gewährt akustischen Aufnahmen eine natürliche Ausklingzeit (Tail Decay Buffer)
 * und versieht das Puffer-Ende mit einem samtigen Cos² Equal-Power Soft-Release Fade-Out.
 * 
 * Verhindert brutale Kanten-Cuts, schützt Raum- und Saitenresonanzen und eliminiert Clicks/Pops.
 */

/** Standard DAW Tail-Hold Ausklingzeit in Millisekunden (Dreiviertelsekunde) */
export const STUDIO_RECORDING_TAIL_DECAY_MS = 750;

/**
 * 🪄 DAW Goldstandard: Cos² Soft-Release Fade-Out am Puffer-Ende (Zero-Pop Release)
 * 
 * Wendet über die letzten `fadeDurationSec` Sekunden (Standard: 35 ms)
 * eine stetig differenzierbare (C¹-kontinuierliche) Cos²-Kurve an.
 * Dadurch gleitet das Signal harmonisch von 100 % Amplitude auf exakt 0.00 % Nulldurchgang.
 * 
 * @param buffer Der fertige Stereo- oder Mono-AudioBuffer
 * @param fadeDurationSec Dauer des Fade-Outs in Sekunden (Standard: 0.035 s = 35 ms)
 * @returns Der manipulierte AudioBuffer für Chaining
 */
export function applyBufferTailFadeOut(
  buffer: AudioBuffer,
  fadeDurationSec = 0.035
): AudioBuffer {
  if (!buffer || buffer.length <= 0 || fadeDurationSec <= 0) return buffer;

  const sampleRate = buffer.sampleRate;
  // Maximal 40 % der Gesamtlänge faden, falls die Aufnahme ultrakurz sein sollte
  const fadeSamples = Math.min(
    Math.round(fadeDurationSec * sampleRate),
    Math.floor(buffer.length * 0.40)
  );

  if (fadeSamples <= 0) return buffer;

  const totalLength = buffer.length;
  const startIndex = totalLength - fadeSamples;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const channelData = buffer.getChannelData(ch);

    for (let i = 0; i < fadeSamples; i++) {
      // t läuft von 0 (Beginn des Fades) bis 1 (exakt letztes Sample)
      const t = (i + 1) / fadeSamples;
      // Cos² Equal-Power Fade-Out: 0.5 * (1 + cos(pi * t))
      // t = 0 -> 1.0 (nahtloser Übergang)
      // t = 1 -> 0.0 (sanfter Nulldurchgang, Steigung = 0)
      const fadeFactor = 0.5 * (1 + Math.cos(Math.PI * t));
      channelData[startIndex + i] *= fadeFactor;
    }
  }

  return buffer;
}
