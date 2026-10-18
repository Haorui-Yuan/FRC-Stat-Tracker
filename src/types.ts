export type CategoryColor = 'red' | 'blue'
export type Period = 'auto' | 'teleop'
export interface Setup { operatorName: string; matchNumber: string; categoryColor: CategoryColor; trackedTeam: string; beepEnabled: boolean; speechEnabled: boolean }
export interface Observations { defense: boolean; noShow: boolean; brickRslSolid: boolean; brickRslBlinkOff: boolean; beached: boolean; fitUnderTrench: boolean }
export type ObsKey = keyof Observations
export interface Stats { autoHubFuel: number; autoTowerLevel1: boolean; teleopHubFuel: number; teleopPassFuel: number; penalties: number; towerClimbs: number; observations: Observations }
export type NumKey = 'autoHubFuel' | 'teleopHubFuel' | 'teleopPassFuel' | 'penalties' | 'towerClimbs'
export type Action = { t: 'add'; k: NumKey; d: 1 | -1 } | { t: 'tower' } | { t: 'obs'; k: ObsKey }

export const OBS: [ObsKey, string][] = [
  ['defense', 'Defense'], ['noShow', 'No Show'], ['brickRslSolid', 'Brick RSL Solid'],
  ['brickRslBlinkOff', 'Brick RSL Blink/Off'], ['beached', 'Beached'], ['fitUnderTrench', 'Fit Under Trench'],
]
export const ZERO: Stats = {
  autoHubFuel: 0, autoTowerLevel1: false, teleopHubFuel: 0, teleopPassFuel: 0, penalties: 0, towerClimbs: 0,
  observations: { defense: false, noShow: false, brickRslSolid: false, brickRslBlinkOff: false, beached: false, fitUnderTrench: false },
}

/** Pure reducer: returns the SAME object when the action is invalid/no-op. */
export function apply(s: Stats, a: Action): Stats {
  if (a.t === 'add') { const n = s[a.k] + a.d; return n < 0 ? s : { ...s, [a.k]: n } }
  if (a.t === 'tower') return { ...s, autoTowerLevel1: !s.autoTowerLevel1 }
  return { ...s, observations: { ...s.observations, [a.k]: !s.observations[a.k] } }
}
