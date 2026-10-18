import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { audio } from './audio'
import { buildReport } from './report'
import { Action, CategoryColor, NumKey, OBS, Period, Setup, Stats, ZERO, apply } from './types'

const PREF = 'tracker.prefs'
const TOTAL = 160000
const BTN = 'flex-1 min-w-[56px] min-h-[56px] grid place-items-center bg-neutral-700 border border-neutral-400 active:bg-white active:text-black'

type Resolved = { a?: Action; toggle?: boolean } | null
/** Central keyboard map: edit here to change shortcuts. */
function resolve(code: string, period: Period): Resolved {
  const m = /^(?:Digit|Numpad)(\d)$|^Key([A-Z])$/.exec(code)
  if (!m) return null
  const auto = period === 'auto'
  const add = (k: NumKey, d: 1 | -1): Resolved => ({ a: { t: 'add', k, d } })
  switch (m[1] ?? m[2]) {
    case 'Q': case 'W': case 'E': case 'R': return { toggle: true }
    case '7': return add(auto ? 'autoHubFuel' : 'teleopHubFuel', 1)
    case '8': return add(auto ? 'autoHubFuel' : 'teleopHubFuel', -1)
    case '9': return auto ? { a: { t: 'tower' } } : add('teleopPassFuel', 1)
    case '0': return auto ? { a: { t: 'tower' } } : add('teleopPassFuel', -1)
    case 'A': return add('penalties', 1)
    case 'S': return add('penalties', -1)
    case 'D': return add('towerClimbs', 1)
    case 'F': return add('towerClimbs', -1)
    default: return null
  }
}

const Hint = ({ k, children }: { k: string; children: string }) => (
  <div className="text-xs md:text-sm font-bold uppercase text-neutral-200 leading-tight">
    PRESS <kbd className="px-1.5 bg-white text-black font-black">{k}</kbd> FOR {children}
  </div>
)

function Counter(p: { label: string; value: number; deny: number; fs?: string; onAdd: () => void; onSub: () => void; hA?: ReactNode; hS?: ReactNode }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0 bg-black/30 border border-neutral-600 p-2 gap-1">
      <div className="text-base md:text-lg font-black uppercase tracking-wide">{p.label}</div>
      <div className="flex flex-1 items-stretch gap-2 min-h-[64px]">
        <button aria-label={`Increase ${p.label}`} onClick={p.onAdd} className={BTN}><Plus size={32} /></button>
        <div key={p.deny} aria-live="polite" className={`flex-1 grid place-items-center font-black tabular-nums min-w-[2.2ch] ${p.deny ? 'deny' : ''}`} style={{ fontSize: p.fs ?? 'clamp(3rem,10vh,6.5rem)' }}>{p.value}</div>
        <button aria-label={`Decrease ${p.label}`} onClick={p.onSub} className={BTN}><Minus size={32} /></button>
      </div>
      <div className="flex justify-between gap-2 min-h-[1.25rem]"><div>{p.hA}</div><div className="text-right">{p.hS}</div></div>
    </div>
  )
}

function SetupScreen({ onStart }: { onStart: (s: Setup) => void }) {
  const saved = (() => { try { return JSON.parse(localStorage.getItem(PREF) ?? '{}') as { name?: string; beep?: boolean; speech?: boolean } } catch { return {} } })()
  const [name, setName] = useState(saved.name ?? '')
  const [num, setNum] = useState(''), [team, setTeam] = useState('')
  const [color, setColor] = useState<CategoryColor>('red')
  const [beep, setBeep] = useState(saved.beep ?? true)
  const [speech, setSpeech] = useState(saved.speech ?? true)
  const [err, setErr] = useState<Record<string, string>>({})
  const pos = (s: string) => s.trim().length > 0
  const start = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Operator name is required'
    if (!pos(num)) e.num = 'Required'
    if (!pos(team)) e.team = 'Required'
    setErr(e); if (Object.keys(e).length) return
    try { localStorage.setItem(PREF, JSON.stringify({ name: name.trim(), beep, speech })) } catch { /* ignore */ }
    audio.init(beep, speech)
    onStart({ operatorName: name.trim(), matchNumber: num.trim(), categoryColor: color, trackedTeam: team.trim(), beepEnabled: beep, speechEnabled: speech })
  }
  const field = (label: string, v: string, set: (s: string) => void, key: string, mode?: 'numeric') => (
    <label className="block">
      <span className="text-sm font-bold uppercase text-neutral-300">{label}</span>
      <input value={v} onChange={e => set(e.target.value)} inputMode={mode} className="mt-1 w-full h-14 px-3 text-2xl font-bold bg-neutral-900 border-2 border-neutral-500 text-white" />
      {err[key] && <span className="text-red-400 font-bold text-sm">{err[key]}</span>}
    </label>
  )
  const seg = (on: boolean, cls: string) => `flex-1 h-16 text-2xl font-black uppercase border-4 ${on ? `${cls} border-white text-white` : 'bg-neutral-900 border-neutral-600 text-neutral-400'}`
  const tog = (label: string, v: boolean, set: (b: boolean) => void) => (
    <div><div className="text-sm font-bold uppercase text-neutral-300 mb-1">{label}</div>
      <div className="flex gap-2">
        <button aria-pressed={v} onClick={() => set(true)} className={seg(v, 'bg-green-700')}>Enabled</button>
        <button aria-pressed={!v} onClick={() => set(false)} className={seg(!v, 'bg-neutral-600')}>Disabled</button>
      </div></div>
  )
  return (
    <div className="min-h-full grid place-items-center p-4 text-white">
      <div className="w-full max-w-lg border-2 border-neutral-500 bg-neutral-950 p-5 space-y-4">
        <h1 className="text-2xl font-black uppercase tracking-widest border-b-2 border-neutral-600 pb-2">Session Setup</h1>
        {field('Operator name', name, setName, 'name')}
        <div className="grid grid-cols-2 gap-3">{field('Match number', num, setNum, 'num')}{field('Tracked team', team, setTeam, 'team')}</div>
        <div><div className="text-sm font-bold uppercase text-neutral-300 mb-1">Color</div>
          <div className="flex gap-2">
            <button aria-pressed={color === 'red'} onClick={() => setColor('red')} className={seg(color === 'red', 'bg-red-700')}>Red</button>
            <button aria-pressed={color === 'blue'} onClick={() => setColor('blue')} className={seg(color === 'blue', 'bg-blue-700')}>Blue</button>
          </div></div>
        {tog('Beeps', beep, setBeep)}
        {tog('Speech (TTS)', speech, setSpeech)}
        <button onClick={start} className="w-full h-20 bg-white text-black text-3xl font-black uppercase tracking-widest active:bg-neutral-300">Start</button>
      </div>
    </div>
  )
}

function Tracker({ setup, onExit }: { setup: Setup; onExit: () => void }) {
  const [stats, setStats] = useState<Stats>(ZERO)
  const [period, setPeriod] = useState<Period>('auto')
  const [flash, setFlash] = useState(0)
  const [deny, setDeny] = useState<{ k: NumKey | ''; n: number }>({ k: '', n: 0 })
  const [rem, setRem] = useState(TOTAL)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const statsRef = useRef(stats), periodRef = useRef(period), remRef = useRef(TOTAL), busyRef = useRef(false)

  const run = useCallback((a: Action) => {
    const n = apply(statsRef.current, a)
    if (n === statsRef.current) { if (a.t === 'add') setDeny(d => ({ k: a.k, n: d.n + 1 })); return }
    statsRef.current = n; setStats(n)
    if (a.t === 'obs') return
    audio.beep(a.t === 'add' && (a.k === 'penalties' || a.k === 'towerClimbs') ? 'adj' : 'score')
    setFlash(f => f + 1)
  }, [])
  const pick = useCallback((p: Period) => { periodRef.current = p; setPeriod(p); audio.beep('mode') }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const r = resolve(e.code, periodRef.current)
      if (!r) return
      e.preventDefault()
      if (e.repeat) return
      if (r.toggle) pick(periodRef.current === 'auto' ? 'teleop' : 'auto'); else if (r.a) run(r.a)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [run, pick])

  useEffect(() => {
    const t0 = performance.now(); const said = new Set<string>()
    const tick = () => {
      const el = performance.now() - t0, left = Math.max(0, TOTAL - el)
      remRef.current = left; setRem(left)
      if (el >= 20000 && !said.has('t')) { said.add('t'); audio.speak('Start Tele-Op') }
      if (left <= 30000 && !said.has('e')) { said.add('e'); audio.speak('Start endgame') }
      if (left <= 0 && !said.has('g')) { said.add('g'); audio.speak('Game over') }
    }
    const id = window.setInterval(tick, 100); tick()
    return () => { window.clearInterval(id); audio.stop() }
  }, [])

  const submit = () => {
    if (busyRef.current) return
    busyRef.current = true; setBusy(true)
    try {
      const { doc, filename } = buildReport(setup, statsRef.current, remRef.current, remRef.current === 0)
      doc.save(filename)
      setMsg({ ok: true, text: `Report downloaded: ${filename}. Data was NOT cleared. Any further edits need another submission, which creates a new report.` })
    } catch (e) {
      setMsg({ ok: false, text: `PDF export failed (${e instanceof Error ? e.message : 'unknown error'}). All tracking data is preserved. Return to the tracker and submit again.` })
    } finally { busyRef.current = false; setBusy(false) }
  }

  const dn = (k: NumKey) => (deny.k === k ? deny.n : 0)
  const add = (k: NumKey, d: 1 | -1) => () => run({ t: 'add', k, d })
  const secs = Math.ceil(rem / 1000), clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  const section = (p: Period, title: string, children: ReactNode) => {
    const sel = period === p
    return (
      <section className={`flex flex-col flex-1 min-h-0 p-2 gap-2 ${sel ? 'border-4 border-white bg-neutral-800' : 'border-2 border-neutral-600 bg-neutral-900'}`}>
        <button onClick={() => pick(p)} aria-pressed={sel} className={`flex items-center justify-between min-h-[48px] px-3 font-black uppercase text-2xl ${sel ? 'bg-white text-black' : 'bg-neutral-700 text-neutral-200'}`}>
          <span>{title}{sel ? ' - SELECTED' : ''}</span>
          <span className="text-xs md:text-sm font-bold">PRESS Q / W / E / R TO {sel ? `SWITCH TO ${p === 'auto' ? 'TELEOP' : 'AUTO'}` : `SELECT ${title}`}</span>
        </button>
        <div className="flex flex-1 gap-2 min-h-0 flex-col sm:flex-row">{children}</div>
      </section>
    )
  }
  const autoSel = period === 'auto', teleSel = period === 'teleop'
  const tower = stats.autoTowerLevel1
  const panel = (label: string, k: NumKey, v: string, hs: string, ha: string, ks: [string, string]) => (
    <div className="flex flex-col flex-1 min-w-0 border-2 border-neutral-600 bg-neutral-900 p-2">
      <Counter label={label} fs="clamp(2.5rem,7vh,4.5rem)" value={stats[k]} deny={dn(k)} onAdd={add(k, 1)} onSub={add(k, -1)}
        hA={<Hint k={ks[0]}>{ha}</Hint>} hS={<Hint k={ks[1]}>{hs}</Hint>} />
      <span className="sr-only">{v}</span>
    </div>
  )
  return (
    <div className="min-h-full md:h-full flex flex-col text-white bg-neutral-950">
      <header className={`relative overflow-hidden ${setup.categoryColor === 'red' ? 'bg-red-900' : 'bg-blue-900'}`}>
        {flash > 0 && <div key={flash} className="flash absolute inset-0 bg-white pointer-events-none" />}
        <div className="relative flex items-center justify-between gap-3 px-4 py-2">
          <div><div className="text-xs font-bold uppercase text-white/80">Team · {setup.categoryColor} · {setup.operatorName}</div>
            <div className="font-black leading-none" style={{ fontSize: 'clamp(2rem,7vh,4rem)' }}>TEAM {setup.trackedTeam}</div></div>
          <div className="text-center"><div className="text-xs font-bold uppercase text-white/80">Match</div>
            <div className="font-black leading-none" style={{ fontSize: 'clamp(2rem,7vh,4rem)' }}>{setup.matchNumber}</div></div>
          <div className={`font-black tabular-nums leading-none ${rem <= 30000 ? 'text-yellow-300' : ''}`} style={{ fontSize: 'clamp(2.5rem,10vh,5.5rem)' }} role="timer">{clock}</div>
          <button onClick={() => { if (window.confirm('End this session and discard all tracking data?')) onExit() }} className="min-h-[48px] px-3 text-xs font-bold uppercase border border-white/60 active:bg-white active:text-black">End session</button>
        </div>
      </header>
      <main className="flex-1 min-h-0 grid gap-2 p-2 md:grid-cols-[38fr_62fr]">
        <div className="order-2 md:order-1 flex flex-col gap-2 min-h-0">
          <div className="flex flex-[2] gap-2 min-h-[170px] md:min-h-0">
          {panel('Penalties', 'penalties', '', '−1 PENALTY', '+1 PENALTY', ['A', 'S'])}
          {panel('Tower Climbs', 'towerClimbs', '', '−1 TOWER CLIMB', '+1 TOWER CLIMB', ['D', 'F'])}
          </div>
          <div className="flex flex-col flex-[4] min-h-[300px] md:min-h-0 border-2 border-neutral-600 bg-neutral-900 p-2 gap-2">
            <div className="font-black uppercase text-lg">Observations</div>
            <div className="grid grid-cols-2 grid-rows-3 gap-2 flex-1 min-h-0">
              {OBS.map(([k, label]) => { const on = stats.observations[k]; return (
                <button key={k} aria-pressed={on} onClick={() => run({ t: 'obs', k })}
                  className={`flex flex-col items-center justify-center px-1 text-center font-black uppercase leading-tight border-2 border-black/40 text-white active:brightness-125 ${on ? 'bg-green-700' : 'bg-red-800'}`}>
                  <span style={{ fontSize: 'clamp(1rem,2.6vh,1.6rem)' }}>{label}</span><span className="text-sm">{on ? 'ON' : 'OFF'}</span>
                </button>) })}
            </div>
          </div>
        </div>
        <div className="order-1 md:order-2 flex flex-col gap-2 min-h-0">
          {section('auto', 'AUTO',
            <>
              <Counter label="Hub Fuel" value={stats.autoHubFuel} deny={dn('autoHubFuel')} onAdd={add('autoHubFuel', 1)} onSub={add('autoHubFuel', -1)}
                hA={autoSel ? <Hint k="7">+1 HUB FUEL</Hint> : undefined} hS={autoSel ? <Hint k="8">−1 HUB FUEL</Hint> : undefined} />
              <div className="flex flex-col flex-1 min-w-0 bg-black/30 border border-neutral-600 p-2 gap-1">
                <div className="text-base md:text-lg font-black uppercase">Tower Level 1</div>
                <button aria-pressed={tower} onClick={() => run({ t: 'tower' })} className={`flex-1 min-h-[64px] font-black text-4xl uppercase border-2 border-black/40 ${tower ? 'bg-green-700' : 'bg-red-800'}`}>{tower ? 'ON' : 'OFF'}</button>
                <div className="min-h-[1.25rem]">{autoSel && <div className="text-xs md:text-sm font-bold uppercase text-neutral-200">PRESS <kbd className="px-1.5 bg-white text-black font-black">9</kbd> OR <kbd className="px-1.5 bg-white text-black font-black">0</kbd> TO TOGGLE TOWER LEVEL 1</div>}</div>
              </div>
            </>)}
          {section('teleop', 'TELEOP',
            <>
              <Counter label="Hub Fuel" value={stats.teleopHubFuel} deny={dn('teleopHubFuel')} onAdd={add('teleopHubFuel', 1)} onSub={add('teleopHubFuel', -1)}
                hA={teleSel ? <Hint k="7">+1 HUB FUEL</Hint> : undefined} hS={teleSel ? <Hint k="8">−1 HUB FUEL</Hint> : undefined} />
              <Counter label="Pass Fuel" value={stats.teleopPassFuel} deny={dn('teleopPassFuel')} onAdd={add('teleopPassFuel', 1)} onSub={add('teleopPassFuel', -1)}
                hA={teleSel ? <Hint k="9">+1 PASS FUEL</Hint> : undefined} hS={teleSel ? <Hint k="0">−1 PASS FUEL</Hint> : undefined} />
            </>)}
        </div>
      </main>
      <footer className="p-2 pt-0">
        <button onClick={submit} disabled={busy} className="w-full h-16 bg-white text-black text-2xl font-black uppercase tracking-widest active:bg-neutral-300 disabled:opacity-60">{busy ? 'Generating…' : 'Submit Report'}</button>
      </footer>
      {msg && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/80 p-4" role="alertdialog" aria-modal="true">
          <div className={`max-w-lg w-full p-5 bg-neutral-950 border-4 ${msg.ok ? 'border-green-600' : 'border-red-600'}`}>
            <div className="text-2xl font-black uppercase mb-2">{msg.ok ? 'Report submitted' : 'Export error'}</div>
            <p className="mb-4 break-words">{msg.text}</p>
            <button autoFocus onClick={() => setMsg(null)} className="w-full h-14 bg-white text-black font-black uppercase text-xl">Return to tracker</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [setup, setSetup] = useState<Setup | null>(null)
  return setup ? <Tracker setup={setup} onExit={() => setSetup(null)} /> : <SetupScreen onStart={setSetup} />
}
