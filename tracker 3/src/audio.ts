let ctx: AudioContext | null = null
let beepOn = true
let speechOn = true
type Kind = 'score' | 'adj' | 'mode'

function pickVoice(): SpeechSynthesisVoice | undefined {
  const v = speechSynthesis.getVoices().filter(x => x.lang.toLowerCase().startsWith('en'))
  return v.find(x => /natural|google|samantha|aria|jenny/i.test(x.name)) ?? v.find(x => x.default) ?? v[0]
}
function tone(freq: number, at: number, dur: number, type: OscillatorType) {
  if (!ctx) return
  const o = ctx.createOscillator(), g = ctx.createGain()
  o.type = type; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, ctx.currentTime + at)
  g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + at + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + dur)
  o.connect(g).connect(ctx.destination)
  o.start(ctx.currentTime + at); o.stop(ctx.currentTime + at + dur + 0.02)
}
export const audio = {
  /** Call from a user gesture (Start button) so audio/speech can unlock. */
  init(beep: boolean, speech: boolean) {
    beepOn = beep; speechOn = speech
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx ??= new AC(); void ctx.resume()
    } catch { /* audio unavailable: tracker still works */ }
    try { speechSynthesis.getVoices() } catch { /* ignore */ }
  },
  beep(kind: Kind) {
    if (!beepOn) return
    try {
      if (kind === 'score') tone(880, 0, 0.07, 'sine')
      else if (kind === 'adj') tone(620, 0, 0.08, 'triangle')
      else { tone(420, 0, 0.06, 'square'); tone(640, 0.07, 0.06, 'square') }
    } catch { /* ignore */ }
  },
  speak(text: string) {
    if (!speechOn) return
    try {
      const u = new SpeechSynthesisUtterance(text); const v = pickVoice()
      if (v) u.voice = v
      u.lang = v?.lang ?? 'en-US'; speechSynthesis.speak(u)
    } catch { /* ignore */ }
  },
  stop() { try { speechSynthesis.cancel() } catch { /* ignore */ } },
}
