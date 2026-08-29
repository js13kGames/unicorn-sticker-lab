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

// arrangement, not harmony - a longer cycle laid on top of the 4-bar chord
// progression above. The trailing BREAK_BARS of every BREAK_EVERY-bar
// stretch drop the bass and thin the melody out (a "chill" breakdown),
// then the next cycle's first bar brings both back at once - the bass
// re-entering *is* the "rebuild" cue, cheaper than a gradual fade back in
const BREAK_EVERY = 8
const BREAK_BARS = 2

let musicOn = false
let timer: number | undefined
let barCount = 0

// per-note volume wobble so the loop doesn't sound perfectly mechanical -
// the same "humanize" trick real sequencers use, kept small enough to stay
// under the GDD's own "without becoming annoying" bar
function jitterGain(base: number): number {
  return base * (0.85 + Math.random() * 0.3)
}

function scheduleBar(bar: number, sparse: boolean): void {
  if (!sparse) note(BASS[bar], BASS[bar], STEPS_PER_BAR * STEP, 'triangle', jitterGain(0.06), 0)

  MELODY.forEach((freq, step) => {
    // clamped to 0 - step 0's own jitter can otherwise go slightly
    // negative, and note() computes an absolute start time from it
    // (ctx.currentTime + delay) that the Web Audio API throws on if it
    // ends up negative, which was fatal: an uncaught throw here aborts
    // scheduleBar() mid-loop, so the bar's own reschedule at the bottom of
    // loop() never runs and the whole music loop dies silently for good
    const delay = Math.max(0, step * STEP + (Math.random() - 0.5) * 0.02)

    if (freq) {
      // during the break, drop roughly half the melody notes too, rather
      // than just muting the bass under an unchanged melody
      if (sparse && Math.random() < 0.55) return

      note(freq, freq, STEP * 0.9, 'sine', jitterGain(sparse ? 0.035 : 0.05), delay)
      // an occasional soft octave-up sparkle - variety without ever
      // leaving the chord/scale safety net, since it's the same pitch
      // class as the note it rides on, just doubled a register up.
      // Skipped during the break - the point there is *less*, not more.
      if (!sparse && Math.random() < 0.18) note(freq * 2, freq * 2, STEP * 0.5, 'sine', jitterGain(0.02), delay)
    } else if (!sparse && Math.random() < 0.12) {
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

  const sparse = barCount % BREAK_EVERY >= BREAK_EVERY - BREAK_BARS

  scheduleBar(bar, sparse)
  barCount += 1
  timer = window.setTimeout(() => loop((bar + 1) % BASS.length), STEPS_PER_BAR * STEP * 1000)
}

export function startMusic(): void {
  if (musicOn) return
  musicOn = true
  // always resumes at the start of a full cycle (not mid-break) - simpler
  // and more predictable than remembering where a previous mute interrupted
  barCount = 0
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
