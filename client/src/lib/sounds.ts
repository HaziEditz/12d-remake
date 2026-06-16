const SOUND_ENABLED_KEY = "12digits_sound_enabled";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === "true";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

function playTone(frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.3): void {
  if (typeof window === "undefined") return;
  if (!isSoundEnabled()) return;
  
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (error) {
    console.warn("Audio playback failed:", error);
  }
}

export function playTradeSound(): void {
  playTone(880, 0.1, "sine", 0.2);
  setTimeout(() => playTone(1100, 0.15, "sine", 0.2), 100);
}

export function playLessonCompleteSound(): void {
  playTone(523, 0.15, "sine", 0.25);
  setTimeout(() => playTone(659, 0.15, "sine", 0.25), 150);
  setTimeout(() => playTone(784, 0.2, "sine", 0.25), 300);
}

export function playAchievementSound(): void {
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, "sine", 0.2), i * 100);
  });
}

export function playNotificationSound(): void {
  playTone(600, 0.1, "sine", 0.15);
  setTimeout(() => playTone(800, 0.1, "sine", 0.15), 100);
}

export function playErrorSound(): void {
  playTone(200, 0.2, "square", 0.15);
}

export function playClickSound(): void {
  playTone(1000, 0.05, "sine", 0.1);
}
