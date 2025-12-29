// Notification sound utility using Web Audio API
// Creates a pleasant ding/chime sound without requiring audio files

let audioContext: AudioContext | null = null;

/**
 * Get or create AudioContext (must be called after user interaction)
 */
const getAudioContext = (): AudioContext | null => {
  if (!audioContext && typeof AudioContext !== 'undefined') {
    audioContext = new AudioContext();
  }
  return audioContext;
};

/**
 * Play a notification sound
 * Creates a pleasant ding sound using Web Audio API
 */
export const playNotificationSound = (): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Resume context if suspended (needed for autoplay policy)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Create oscillator for main tone
    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, now); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.3); // Slide down to A4
    
    // Create gain for envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    // Add harmonics for richer sound
    const oscillator2 = ctx.createOscillator();
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(1320, now); // E6
    oscillator2.frequency.exponentialRampToValueAtTime(660, now + 0.3);
    
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.15, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    
    // Connect everything
    oscillator.connect(gain);
    oscillator2.connect(gain2);
    gain.connect(ctx.destination);
    gain2.connect(ctx.destination);
    
    // Start and stop
    oscillator.start(now);
    oscillator.stop(now + 0.5);
    oscillator2.start(now);
    oscillator2.stop(now + 0.4);
    
    console.log('🔔 Notification sound played');
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

/**
 * Play a success sound (for order ready, etc.)
 */
export const playSuccessSound = (): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    
    // Three ascending tones for success
    const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 (C major chord)
    
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
    
    console.log('✅ Success sound played');
  } catch (error) {
    console.warn('Could not play success sound:', error);
  }
};

/**
 * Vibrate device if supported (mobile)
 */
export const vibrate = (pattern: number | number[] = 200): void => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};
