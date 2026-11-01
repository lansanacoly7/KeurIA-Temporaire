"use client";

// Simple Web Audio API sound generator for kids dashboard
// Generates fun sounds on the fly without needing external MP3/WAV files

class SoundManager {
  private audioCtx: AudioContext | null = null;
  private isEnabled: boolean = true;

  private init() {
    if (!this.audioCtx && typeof window !== "undefined") {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
  }

  public enable(state: boolean) {
    this.isEnabled = state;
  }

  // Play a single oscillator note with a gain envelope
  private playTone(frequency: number, type: OscillatorType, duration: number, volume: number = 0.5) {
    this.init();
    if (!this.audioCtx || !this.isEnabled) return;
    
    // Resume context if suspended (browser auto-play policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    const oscillator = this.audioCtx.createOscillator();
    const gainNode = this.audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, this.audioCtx.currentTime);

    // Envelope
    gainNode.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(volume, this.audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.audioCtx.destination);

    oscillator.start(this.audioCtx.currentTime);
    oscillator.stop(this.audioCtx.currentTime + duration);
  }

  public playClick() {
    this.playTone(600, 'sine', 0.1, 0.3);
  }

  public playPop() {
    this.init();
    if (!this.audioCtx || !this.isEnabled) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    
    osc.type = 'sine';
    // Frequency sweep for a "pop" sound
    osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.5, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    
    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.1);
  }

  public playSuccess() {
    this.init();
    if (!this.audioCtx || !this.isEnabled) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    
    const now = this.audioCtx.currentTime;
    
    // Arpeggio C-E-G-C
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    
    freqs.forEach((freq, i) => {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const startTime = now + (i * 0.1);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.3);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.3);
    });
  }

  public playWrong() {
    this.init();
    if (!this.audioCtx || !this.isEnabled) return;
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
    
    const now = this.audioCtx.currentTime;
    
    // Buzz sound
    const freqs = [150, 100];
    
    freqs.forEach((freq, i) => {
      if (!this.audioCtx) return;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      
      const startTime = now + (i * 0.15);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gain.gain.linearRampToValueAtTime(0, startTime + 0.2);
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }
}

// Singleton instance
export const soundManager = new SoundManager();
