/**
 * Utilitaire sonore Web Audio pour les mini-jeux avancés.
 * Produit un bip aigu pour une bonne réponse (660 Hz) et un bip grave pour une erreur (180 Hz).
 * Silencieux si l'audio n'est pas autorisé par le navigateur.
 */
export function playFeedbackSound(ok: boolean): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.frequency.value = ok ? 660 : 180;
    osc.type = ok ? "sine" : "sawtooth";
    gain.gain.value = 0.08;

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 300);
  } catch {
    // L'audio est facultatif : on continue silencieusement si bloqué par le navigateur
  }
}
