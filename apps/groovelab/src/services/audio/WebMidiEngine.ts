/**
 * Campus-Groovelab Web-MIDI Input Engine
 * 
 * 1% Goldstandard for Digital Instruments & E-Drums:
 * - 0ms hardware latency direct connection
 * - Auto-connects to Roland V-Drums, Alesis, Yamaha, and Masterkeyboards
 * - Safe permissions check & graceful fallback if Web-MIDI is unavailable
 */

export interface MidiHitEvent {
  note: number;
  velocity: number;
  timestampSec: number;
  deviceName?: string;
}

export type MidiHitListener = (hit: MidiHitEvent) => void;

export class WebMidiEngine {
  private static instance: WebMidiEngine | null = null;

  private midiAccess: any = null;
  private isConnected = false;
  private deviceNames: string[] = [];
  private listeners: Set<MidiHitListener> = new Set();

  private constructor() {}

  public static getInstance(): WebMidiEngine {
    if (!WebMidiEngine.instance) {
      WebMidiEngine.instance = new WebMidiEngine();
    }
    return WebMidiEngine.instance;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getDeviceNames(): string[] {
    return [...this.deviceNames];
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && Boolean((navigator as any).requestMIDIAccess);
  }

  public subscribeHit(listener: MidiHitListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public async start(): Promise<boolean> {
    if (!this.isSupported()) return false;
    if (this.isConnected && this.midiAccess) return true;

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
      this.bindInputs();

      this.midiAccess.onstatechange = () => {
        this.bindInputs();
      };

      this.isConnected = true;
      return true;
    } catch (err) {
      console.warn('[WebMidiEngine] Could not access MIDI devices:', err);
      this.isConnected = false;
      return false;
    }
  }

  public stop(): void {
    if (this.midiAccess) {
      try {
        const inputs = this.midiAccess.inputs.values();
        for (const input of inputs) {
          input.onmidimessage = null;
        }
      } catch (_) {}
    }
    this.isConnected = false;
    this.deviceNames = [];
  }

  private bindInputs(): void {
    if (!this.midiAccess) return;

    const names: string[] = [];
    const inputs = this.midiAccess.inputs.values();

    for (const input of inputs) {
      names.push(input.name || 'MIDI Gerät');
      input.onmidimessage = (event: any) => this.handleMidiMessage(event, input.name);
    }

    this.deviceNames = names;
  }

  private handleMidiMessage(event: any, deviceName?: string): void {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0] & 0xf0;
    const note = data[1];
    const velocity = data[2];

    // 0x90 = Note On. Velocity > 0 means actual key/pad press
    if (status === 0x90 && velocity > 0) {
      const timestampSec = (event.timeStamp || performance.now()) / 1000;
      this.notifyHit({
        note,
        velocity,
        timestampSec,
        deviceName
      });
    }
  }

  private notifyHit(hit: MidiHitEvent): void {
    this.listeners.forEach(fn => {
      try { fn(hit); } catch (err) { console.error('[WebMidiEngine] Error in listener:', err); }
    });
  }
}
