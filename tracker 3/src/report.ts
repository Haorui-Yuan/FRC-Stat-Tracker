import { jsPDF } from 'jspdf'
import { OBS, Setup, Stats } from './types'

export const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'NA'
const fmt = (ms: number) => { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

export function buildReport(setup: Setup, st: Stats, remainingMs: number, reachedZero: boolean) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  let y = 56
  const sec = (t: string) => { y += 8; doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(t, 48, y); y += 6; doc.line(48, y, 564, y); y += 18 }
  const row = (a: string, b: string) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.text(a, 56, y); doc.setFont('helvetica', 'bold'); doc.text(b, 300, y); y += 18 }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('TRACKING SESSION REPORT', 48, y); y += 10
  doc.setLineWidth(1.5); doc.line(48, y, 564, y); doc.setLineWidth(0.5); y += 12
  sec('SESSION INFORMATION')
  row('Operator', setup.operatorName); row('Match number', String(setup.matchNumber))
  row('Color', setup.categoryColor.toUpperCase()); row('Tracked team', String(setup.trackedTeam))
  row('Generated', new Date().toLocaleString())
  sec('PRIMARY STATISTICS')
  row('AUTO Hub Fuel', String(st.autoHubFuel)); row('AUTO Tower Level 1', st.autoTowerLevel1 ? 'ON' : 'OFF')
  row('TELEOP Hub Fuel', String(st.teleopHubFuel)); row('TELEOP Pass Fuel', String(st.teleopPassFuel))
  sec('ADDITIONAL STATISTICS')
  row('Penalties', String(st.penalties)); row('Tower climbs', String(st.towerClimbs))
  sec('OBSERVATIONS')
  OBS.forEach(([k, label]) => row(label, st.observations[k] ? '[X] ENABLED' : '[ ] disabled'))
  sec('REPORT METADATA')
  row('Timer at submission', fmt(remainingMs)); row('Countdown reached 0:00', reachedZero ? 'YES' : 'NO')
  row('Status', 'Submitted from client-side tracker')
  const filename = `Tracking_Match_${safe(setup.matchNumber)}_Team_${safe(setup.trackedTeam)}_${setup.categoryColor === 'red' ? 'Red' : 'Blue'}_${safe(setup.operatorName)}.pdf`
  return { doc, filename }
}
