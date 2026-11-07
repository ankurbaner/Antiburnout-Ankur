let audio: AudioContext | null = null;

export const unlockChime = (): void => {
  try {
    audio ??= new AudioContext();
    if (audio.state === "suspended") void audio.resume().catch(() => {});
  } catch {
    /* audio may be unavailable */
  }
};

export const playChime = (): void => {
  if (!audio || audio.state !== "running") return;
  try {
    const now = audio.currentTime;
    for (const [offset, frequency] of [[0, 523.25], [0.25, 659.25]]) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.035, now + offset + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.4);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.45);
    }
  } catch {
    /* a chime must never interrupt a card */
  }
};
