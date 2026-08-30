let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()

  return audioCtx
}

// A short pitch-ramped tone with a quick exponential decay, starting `delay`
// seconds from now - the building block for every sound effect below.
// Ramping the frequency up reads as a "pop", ramping it down reads as a
// "descending" cue, flat reads as a click. Scheduled via the audio clock
// (not setTimeout) so sequences like playDiscovery's arpeggio stay
// sample-accurate instead of drifting with JS timer jitter.
export function note(
  freqFrom: number,
  freqTo: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
): void {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  const start = ctx.currentTime + delay

  osc.type = type
  osc.frequency.setValueAtTime(freqFrom, start)
  osc.frequency.exponentialRampToValueAtTime(freqTo, start + duration)

  amp.gain.setValueAtTime(gain, start)
  amp.gain.exponentialRampToValueAtTime(0.001, start + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(start)
  osc.stop(start + duration)
}

// +/-5% random pitch per play - the same short blip firing dozens of times
// a session (place, click, rotate...) read as a robot clicking buttons
// without it. Kept out of note() itself, not applied here-and-up: a
// melodic sequence like playDiscovery's arpeggio wants its notes staying
// in exact tune with each other, which independent per-note wobble would
// blur.
function blip(
  freqFrom: number, freqTo: number, duration: number, type: OscillatorType, gain: number, delay = 0,
): void {
  const wobble = 0.95 + Math.random() * 0.1

  note(freqFrom * wobble, freqTo * wobble, duration, type, gain, delay)
}

export function playPlace(): void {
  blip(320, 720, 0.09, 'sine', 0.15)
}

export function playDelete(): void {
  blip(500, 140, 0.12, 'triangle', 0.12)
}

export function playClick(): void {
  // sine (same as playDrop) instead of triangle/square, and pitched down
  // partway toward it too - still clearly a quick tap, not a thud
  blip(480, 430, 0.045, 'sine', 0.045)
}

export function playDrop(): void {
  blip(160, 80, 0.07, 'sine', 0.12)
}

// the toolbar's own edit actions used to all share playClick, which gave
// rotate/scale/flip/layer no way to feel like different actions - each
// gets its own tiny sweep instead, direction-coded where the action
// itself has a direction (dir>0 the "forward" one: rotR, scaleUp, front)
export function playRotate(dir: number): void {
  blip(dir > 0 ? 380 : 460, dir > 0 ? 460 : 380, 0.06, 'triangle', 0.09)
}

export function playScale(dir: number): void {
  blip(dir > 0 ? 300 : 340, dir > 0 ? 340 : 300, 0.05, 'square', 0.07)
}

export function playFlip(): void {
  blip(480, 300, 0.05, 'sine', 0.09)
  blip(300, 480, 0.05, 'sine', 0.08, 0.05)
}

export function playLayer(dir: number): void {
  blip(dir > 0 ? 350 : 500, dir > 0 ? 500 : 350, 0.07, 'sine', 0.08)
}

// A little ascending arpeggio for finding a new discovery - bigger and
// brighter than the other feedback sounds, since this is the game's main
// reward moment.
export function playDiscovery(): void {
  note(523, 523, 0.12, 'sine', 0.14, 0) // C5
  note(659, 659, 0.12, 'sine', 0.14, 0.1) // E5
  note(784, 900, 0.22, 'sine', 0.18, 0.2) // G5, ringing up slightly
}

// A bigger fanfare for milestones (unlocking new pieces/sizes, finishing
// the whole collection) - one more note than playDiscovery, reaching a
// full octave above where that one starts, so a milestone still stands out
// next to the sound already used for every ordinary recipe find.
export function playUnlock(): void {
  note(523, 523, 0.1, 'sine', 0.15, 0) // C5
  note(659, 659, 0.1, 'sine', 0.15, 0.09) // E5
  note(784, 784, 0.1, 'sine', 0.15, 0.18) // G5
  note(1047, 1200, 0.3, 'sine', 0.2, 0.27) // C6, ringing up
}
