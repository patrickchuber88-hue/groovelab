/**
 * 🎨 Kontinuierliche Audio-Sonifikations-Engine für blinde & sehbehinderte Musiker (DES-AUDIT-02 / GRV-25)
 *
 * Erweitert das Stimmgerät (CampusTuner) nach BFSG 2025 / EN 301 549 um eine
 * unmittelbare akustische Richtungsführung während des Stimmvorgangs:
 * - Zu tief (< -3 Cent): Sanfter, dunkler Dreieck-Impuls (330 Hz -> steigend Richtung 440 Hz)
 * - Zu hoch (> +3 Cent): Sanfter, heller Sinus-Impuls (660 Hz -> sinkend Richtung 440 Hz)
 * - Impuls-Intervall verkürzt sich proportional zur Annäherung an den ±3 Cent Sweet-Spot.
 *
 * 100 % deterministische WebAudio-Synthese im Browser (0 % Cloud / 0 % KI).
 */

export class TunerA11ySonificationEngine {
  private lastPulseTimeMs = 0;

  public triggerDirectionalGuidancePulse(
    ctx: AudioContext | null,
    centsDeviation: number,
    isEnabled: boolean
  ): void {
    if (!isEnabled || !ctx || ctx.state === 'closed') return;

    const absCents = Math.abs(centsDeviation);
    // Innerhalb von ±3 Cent übernimmt bereits der zweistufige Lock-In-Chime (GRV-20)
    if (absCents <= 3) return;

    const nowMs = performance.now();
    // Dynamische Wiederholrate: 320ms nahe der Mitte, bis 750ms bei starker Verstimmung
    const intervalMs = Math.min(750, Math.max(320, 260 + absCents * 9));
    if (nowMs - this.lastPulseTimeMs < intervalMs) return;

    this.lastPulseTimeMs = nowMs;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Zu tief (< -3 Cent): warmer tiefer Leit-Impuls (310–415 Hz)
      // Zu hoch (> +3 Cent): klarer hoher Leit-Impuls (465–590 Hz)
      const isFlat = centsDeviation < -3;
      osc.type = isFlat ? 'triangle' : 'sine';
      const guideFreq = isFlat
        ? Math.max(290, 420 + centsDeviation * 2.2)
        : Math.min(620, 460 + centsDeviation * 2.4);

      osc.frequency.setValueAtTime(guideFreq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.075, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Fail-silent if AudioContext is interrupted
    }
  }

  public reset(): void {
    this.lastPulseTimeMs = 0;
  }
}
