import { note } from './audio'

// GDD §23: "a short looping musical pattern... cheerful and magical
// without becoming annoying." Reuses audio.ts's note() (the same
// oscillator + exponential-decay envelope every sound effect already
// uses) rather than a new synthesis system - one bar is just a batch of
// note() calls with precomputed delay offsets, all scheduled at once.
// Re-scheduling the next bar via a plain setTimeout (rather than a full
// lookahead scheduler) keeps this small - a single bar's worth of JS-timer
// drift (a couple of seconds) is imperceptible for ambient background
// music, unlike playDiscovery's short arpeggio where sample accuracy
// actually matters.
const STEP = 0.26 // seconds per 16th-note step
const STEPS_PER_BAR = 16

// I-V-vi-IV - a famously pleasant, common progression (the "Let It Be"
// changes) - one soft root per bar rather than re-struck per step
const BASS = [131, 196, 220, 175] // C3, G3, A3, F3

// a pentatonic melody (C D E G A) - pentatonic notes stay consonant against
// nearly any of the above chords, so one fixed line works for the whole
// progression without needing a per-chord variant
const MELODY = [
  523, 0, 587, 0, 659, 0, 784, 659,
  587, 0, 523, 0, 440, 0, 523, 0,
]

// the same scale, deduped, for picking a random passing note into a rest
// (see scheduleBar) - reused rather than a second hand-written list, so the
// two can't ever drift out of the same key
const PENTATONIC = [...new Set(MELODY.filter(f => f))]

let musicOn = false
let timer: number | undefined

// per-note volume wobble so the loop doesn't sound perfectly mechanical -
// the same "humanize" trick real sequencers use, kept small enough to stay
// under the GDD's own "without becoming annoying" bar
function jitterGain(base: number): number {
  return base * (0.85 + Math.random() * 0.3)
}

function scheduleBar(bar: number): void {
  note(BASS[bar], BASS[bar], STEPS_PER_BAR * STEP, 'triangle', jitterGain(0.06), 0)

  MELODY.forEach((freq, step) => {
    const delay = step * STEP + (Math.random() - 0.5) * 0.02

    if (freq) {
      note(freq, freq, STEP * 0.9, 'sine', jitterGain(0.05), delay)
      // an occasional soft octave-up sparkle - variety without ever
      // leaving the chord/scale safety net, since it's the same pitch
      // class as the note it rides on, just doubled a register up
      if (Math.random() < 0.18) note(freq * 2, freq * 2, STEP * 0.5, 'sine', jitterGain(0.02), delay)
    } else if (Math.random() < 0.12) {
      // occasionally fill a rest with a quiet passing tone instead of
      // always the exact same silence there - picked from the same
      // pentatonic scale, so it's still guaranteed consonant
      const passing = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)]

      note(passing, passing, STEP * 0.6, 'sine', jitterGain(0.025), delay)
    }
  })
}

function loop(bar: number): void {
  if (!musicOn) return

  scheduleBar(bar)
  timer = window.setTimeout(() => loop((bar + 1) % BASS.length), STEPS_PER_BAR * STEP * 1000)
}

export function startMusic(): void {
  if (musicOn) return
  musicOn = true
  loop(0)
}

// returns the new on/off state so the caller can update the mute button's
// own look without keeping a separate copy of this module's state
export function toggleMusic(): boolean {
  if (musicOn) {
    musicOn = false
    window.clearTimeout(timer)
  } else {
    startMusic()
  }

  return musicOn
}
