"use client";

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      const C = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (C) {
        audioCtx = new C();
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }
  // Resume if suspended (browser policy requires this on user interaction)
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

const audioCache = new Map<string, HTMLAudioElement>();

function playCachedAudio(name: string, fallback: () => void) {
  if (typeof window === "undefined") return;
  try {
    const src = `/audio/palou/sfx/${name}.wav`;
    let a = audioCache.get(src);
    if (!a) {
      a = new Audio(src);
      a.preload = "auto";
      audioCache.set(src, a);
    }
    a.currentTime = 0;
    const p = a.play();
    if (p) p.catch(() => fallback());
  } catch {
    fallback();
  }
}

export function playPop() {
  playCachedAudio("tap", () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(500, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch { /* l'audio est facultatif */ }
  });
}


export function playSuccess() {
  playCachedAudio("ok", () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.type = "sine";
      osc2.type = "sine";
      
      // Play a happy arpeggio C5 - E5 - G5
      const now = ctx.currentTime;
      osc1.frequency.setValueAtTime(523.25, now); 
      osc1.frequency.setValueAtTime(659.25, now + 0.1); 
      osc1.frequency.setValueAtTime(783.99, now + 0.2); 
      
      // A slightly higher harmony
      osc2.frequency.setValueAtTime(659.25, now);
      osc2.frequency.setValueAtTime(783.99, now + 0.1);
      osc2.frequency.setValueAtTime(1046.50, now + 0.2); 
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch { /* l'audio est facultatif */ }
  });
}

export function playError() {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = "square";
    
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    osc.start(now);
    osc.stop(now + 0.3);
  } catch { /* l'audio est facultatif */ }
}

export function playMagic() {
  playCachedAudio("magic", () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);
      
      // Create an arpeggio of high notes
      const freqs = [1046.50, 1318.51, 1567.98, 2093.00, 2637.02, 3135.96]; // C6, E6, G6, C7, E7, G7
      
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.connect(gain);
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
        
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + i * 0.05 + 0.2);
      });
    } catch { /* l'audio est facultatif */ }
  });
}

