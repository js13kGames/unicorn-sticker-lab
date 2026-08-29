let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()

  return audioCtx
}

// A short pitch-ramped blip with a quick exponential decay - the building
// block for every sound effect below. Ramping the frequency up reads as a
// "pop", ramping it down reads as a "descending" cue, flat reads as a click.
function blip(freqFrom: number, freqTo: number, duration: number, type: OscillatorType, gain: number): void {
  const ctx = getAudioContext()
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  const now = ctx.currentTime

  osc.type = type
  osc.frequency.setValueAtTime(freqFrom, now)
  osc.frequency.exponentialRampToValueAtTime(freqTo, now + duration)

  amp.gain.setValueAtTime(gain, now)
  amp.gain.exponentialRampToValueAtTime(0.001, now + duration)

  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + duration)
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
