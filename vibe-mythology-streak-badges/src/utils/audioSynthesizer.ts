/**
 * ViBe Mythology Audio Engine
 * Uses the HTML5 Web Audio API to synthetically generate rich, atmospheric,
 * and elegant soundscapes and bell chimes. Zero external assets required!
 */

class MythologyAudioEngine {
  private ctx: AudioContext | null = null;
  private droneGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private filterNode: BiquadFilterNode | null = null;
  private lfoNode: OscillatorNode | null = null;
  private isEnabled: boolean = false;

  constructor() {
    // Lazy initialize to bypass initial browser autoplay blockages
  }

  /**
   * Initializes the AudioContext upon user gesture (toggling setting on)
   */
  private initContext() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /**
   * Toggles the global sound setting.
   */
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.initContext();
      this.startAmbientSoundscape();
    } else {
      this.stopAmbientSoundscape();
    }
  }

  /**
   * Checks if soundscapes are active
   */
  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Starts a soft, peaceful meditation pad soundscape (A=432Hz inspired).
   * Synthesizes a deep, relaxing binaural-like drone using slow LFOs.
   */
  private startAmbientSoundscape() {
    if (!this.ctx || !this.isEnabled) return;
    
    // Safety check: clear any running drone first
    this.stopAmbientSoundscape();

    try {
      const ctx = this.ctx;
      
      // Master Gain (very gentle and soothing)
      this.droneGain = ctx.createGain();
      this.droneGain.gain.setValueAtTime(0, ctx.currentTime);

      // Gentle lowpass filter for warmth
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(400, ctx.currentTime);
      this.filterNode.Q.setValueAtTime(0.5, ctx.currentTime);

      this.filterNode.connect(this.droneGain);
      this.droneGain.connect(ctx.destination);

      // Create a majestic meditation chord (E major pentatonic roots)
      const baseFreq = 108; // Deep meditative root (A=432Hz mathematical derivative)
      
      const createSoothingOscillator = (freq: number, detune: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = detune; // Slight detune for binaural chorusing effect

        gain.gain.value = volume;
        
        // Slow LFO for volume pulsing (breathing effect)
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.05 + (Math.random() * 0.03); // Very slow breath (10-20 seconds)
        lfoGain.gain.value = volume * 0.4;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        lfo.start();

        osc.connect(gain);
        if (this.filterNode) {
          gain.connect(this.filterNode);
        }

        osc.start();
        return { osc, lfo };
      };

      // Root note + slightly detuned for thickness
      const root1 = createSoothingOscillator(baseFreq, -3, 0.2);
      const root2 = createSoothingOscillator(baseFreq, 3, 0.2);
      
      // Fifth (B)
      const fifth = createSoothingOscillator(baseFreq * 1.5, 0, 0.1);
      
      // Octave higher root
      const octave = createSoothingOscillator(baseFreq * 2, 2, 0.05);

      // Store references for cleanup
      this.droneOscillators = [root1.osc, root1.lfo, root2.osc, root2.lfo, fifth.osc, fifth.lfo, octave.osc, octave.lfo];

      // Fade-in gracefully over 8 seconds for a deeply relaxing entry
      this.droneGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 8.0);
    } catch (e) {
      console.error('Failed to initialize soothing soundscape', e);
    }
  }

  /**
   * Fades out and tears down the ambient soundscape gracefully.
   */
  private stopAmbientSoundscape() {
    const currentGain = this.droneGain;
    const currentOscillators = this.droneOscillators;
    const ctx = this.ctx;

    if (currentGain && ctx && ctx.state === 'running') {
      try {
        // Fade out drone slowly to prevent pops (3 seconds)
        currentGain.gain.setValueAtTime(currentGain.gain.value, ctx.currentTime);
        currentGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 3.0);

        setTimeout(() => {
          try {
            currentOscillators.forEach(osc => {
              try { osc.stop(); } catch (e) {}
            });
            currentGain.disconnect();
          } catch (err) {
            // Ignore
          }
        }, 3200);
      } catch (e) {
        console.error('Error stopping soundscape gracefully', e);
      }
    } else {
      // Force stop if context is suspended or gain is detached
      currentOscillators.forEach(osc => {
        try { osc.stop(); } catch (e) {}
      });
    }

    this.droneGain = null;
    this.droneOscillators = [];
    this.lfoNode = null;
    this.filterNode = null;
  }

  /**
   * Synthesizes a single crystal chime/bell note with nice bell overtones and decay.
   * @param freq The fundamental frequency in Hz
   * @param startTime Delay time when the note starts
   * @param duration Tone decay duration
   * @param volume Peak gain multiplier
   */
  private playBellNote(freq: number, startTime: number, duration: number = 2.0, volume: number = 0.15) {
    if (!this.ctx || !this.isEnabled) return;
    const ctx = this.ctx;

    try {
      // 1. Fundamental note
      const oscFund = ctx.createOscillator();
      oscFund.type = 'sine';
      oscFund.frequency.setValueAtTime(freq, startTime);

      // 2. Harmonic overtone (bell tone richness: 2.76x and 4.38x are highly metallic)
      const oscOvertone1 = ctx.createOscillator();
      oscOvertone1.type = 'sine';
      oscOvertone1.frequency.setValueAtTime(freq * 2.0, startTime);

      const oscOvertone2 = ctx.createOscillator();
      oscOvertone2.type = 'sine';
      oscOvertone2.frequency.setValueAtTime(freq * 3.0, startTime);

      // Envelopes for notes
      const gainFund = ctx.createGain();
      gainFund.gain.setValueAtTime(0, startTime);
      gainFund.gain.linearRampToValueAtTime(volume * 0.7, startTime + 0.02); // quick attack
      gainFund.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // exponential decay

      const gainOvertone1 = ctx.createGain();
      gainOvertone1.gain.setValueAtTime(0, startTime);
      gainOvertone1.gain.linearRampToValueAtTime(volume * 0.25, startTime + 0.01);
      gainOvertone1.gain.exponentialRampToValueAtTime(0.0001, startTime + (duration * 0.6)); // overtone decays faster

      const gainOvertone2 = ctx.createGain();
      gainOvertone2.gain.setValueAtTime(0, startTime);
      gainOvertone2.gain.linearRampToValueAtTime(volume * 0.15, startTime + 0.01);
      gainOvertone2.gain.exponentialRampToValueAtTime(0.0001, startTime + (duration * 0.4)); // high overtone decays even faster

      // Highpass/Lowpass dynamic filter to sweeten bell chime
      const bellFilter = ctx.createBiquadFilter();
      bellFilter.type = 'bandpass';
      bellFilter.frequency.setValueAtTime(freq * 1.5, startTime);
      bellFilter.Q.setValueAtTime(0.8, startTime);

      // Connections
      oscFund.connect(gainFund);
      oscOvertone1.connect(gainOvertone1);
      oscOvertone2.connect(gainOvertone2);

      gainFund.connect(ctx.destination);
      gainOvertone1.connect(bellFilter);
      gainOvertone2.connect(bellFilter);
      bellFilter.connect(ctx.destination);

      // Start/Stop
      oscFund.start(startTime);
      oscOvertone1.start(startTime);
      oscOvertone2.start(startTime);

      oscFund.stop(startTime + duration + 0.1);
      oscOvertone1.stop(startTime + duration + 0.1);
      oscOvertone2.stop(startTime + duration + 0.1);
    } catch (e) {
      console.warn('Could not complete synthesizing individual chime note:', e);
    }
  }

  /**
   * Plays a magnificent ascending, shimmering arpeggio when a milestone is achieved
   * Scale: E pentatonic major (E4, F#4, G#4, B4, C#5, E5) -> Resonates wisdom & joy
   */
  public playMilestoneChime() {
    this.initContext();
    if (!this.ctx || !this.isEnabled) return;
    const now = this.ctx.currentTime;

    // Frequencies: E4 (329.63), G#4 (415.30), B4 (493.88), E5 (659.25), G#5 (830.61)
    const notes = [329.63, 415.30, 493.88, 659.25, 830.61];
    
    notes.forEach((freq, idx) => {
      // Stagger each note by 140ms for a beautiful shimmering ripple
      this.playBellNote(freq, now + (idx * 0.14), 2.5 - (idx * 0.15), 0.18);
    });
  }

  /**
   * Plays an even grander sacred chime for special badges
   * Double-arpeggio evoking a royal mythological fan-fare chime
   */
  public playBadgeUnlockChime() {
    this.initContext();
    if (!this.ctx || !this.isEnabled) return;
    const now = this.ctx.currentTime;

    // Divine Open fifth chords arpeggios: 
    // Low: A3 (220.00), E4 (329.63), A4 (440.00)
    // High: C#5 (554.37), E5 (659.25), A5 (880.00)
    const arpeggio = [220.00, 329.63, 440.00, 554.37, 659.25, 880.00];

    arpeggio.forEach((freq, idx) => {
      // Ripples upward
      this.playBellNote(freq, now + (idx * 0.12), 3.0, 0.15);
    });

    // Add a final brilliant shimmering high tier note for royal majesty
    this.playBellNote(1318.51, now + 0.8, 4.0, 0.08); // E6 crystal bell
  }
}

export const audioSynthesizer = new MythologyAudioEngine();
