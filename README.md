[README.md](https://github.com/user-attachments/files/33613939/README.md)
# FRC Tracking Instrument

Client-side, keyboard-first real-time tracker for FRC Competitions  (React + TypeScript + Vite + Tailwind + jsPDF). No backend.


## Keyboard (all also available as on-screen buttons)
| Key | Action |
|---|---|
| Q / W / E / R | Toggle between AUTO and TELEOP |
| 7 / 8 | +1 / -1 Hub Fuel (selected period) |
| 9 / 0 | AUTO: toggle Tower Level 1. TELEOP: +1 / -1 Pass Fuel |
| A / S | +1 / -1 Penalty |
| D / F | +1 / -1 Tower Climb |
Numpad digits work too. Held keys are ignored; the six observations are click/touch only.

## Decisions
- Stats live in one pure reducer (`apply` in `types.ts`); keyboard, mouse and touch all call the same `run()`, which reads refs, so handlers never see stale state.
- Timer is derived from `performance.now()` (100 ms poll, no drift, accurate after tab blur), floors at 0:00 and never disables input. It only drives the display and announcements, never stats.
- Spec conflict: "Start Tele-Op" is spoken 20 s after start (section 4B), not at start.
- Banner flash and the zero-decrement shake are CSS animations re-triggered by React keys (no timeouts).
- Sounds are Web Audio oscillators; all audio/speech calls are try/caught. Audio unlocks on the Start click.
- Only operator name and the separate beep / speech preferences persist (localStorage); counters never do.
- Submit: PDF built with jsPDF and saved via the browser's normal download. Data is never cleared; a modal returns you to the tracker. Rapid clicks are blocked by a ref lock plus the modal.
- jsPDF's built-in font is Latin-only, so unusual characters in the operator name may not render in the PDF.
