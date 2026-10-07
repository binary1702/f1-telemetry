import { SetupGuide } from './types'

export const rearWing: SetupGuide = {
  id: 'rearWing',

  plain: [
    { tone: 'higher', steps: ['↑ wing', 'rear grip ↑', 'planted rear'] },
    { tone: 'lower', steps: ['↓ wing', 'rear grip ↓', 'oversteer'] }
  ],

  rules: [
    { when: 'Oversteer in fast corners (130+ mph)', then: 'raise', do: 'add wing' },
    { when: 'Understeer in fast corners (130+ mph)', then: 'lower', do: 'take some off, or add front wing' },
    { when: 'Slow on the straights', then: 'lower', do: 'take some off, this is the big one' },
    { when: 'Oversteer on exit of slow corners (< 60 mph)', then: 'other', do: 'not this knob → diff on throttle, rear springs' }
  ],

  mechanism: [
    'Wing angle → rear downforce → rear tyre load → rear grip.',
    'Downforce ∝ speed². A click at 155 mph is ~10× the same click at 45 mph.',
    'Balance = front vs rear. ↑ rear alone moves balance backward: front lets go first → understeer.',
    'The rear wing is the biggest drag item on the car. DRS opens this wing, so its cost is partly refunded on DRS straights.'
  ],

  invariant: 'Rear wing is the biggest lever on top speed and on high-speed stability. Slow-corner oversteer → wrong knob.',

  interactsWith: [
    { id: 'frontWing', how: 'The difference is the balance. ↑ both = grip everywhere, speed cost. ↑ one = balance shift.' },
    { id: 'rearRideHeight', how: 'More rake works the floor harder at the rear → less wing needed for the same rear grip.' },
    { id: 'rearAntiRollBar', how: 'Same symptom, slow corners. Hairpin oversteer → rear ARB softer. Fast sweeper oversteer → wing.' },
    { id: 'diffOnThrottle', how: 'Exit oversteer on the throttle at low speed is the diff, not the wing. Wing only helps once the car is fast.' }
  ],

  symptoms: [
    { symptom: 'Oversteer on entry or apex, fast corners (130+ mph)', phase: 'entry', change: 'raise', because: 'rear unloaded at speed' },
    { symptom: 'Understeer everywhere at speed, car feels glued at the back', phase: 'apex', change: 'lower', because: 'balance too far back' },
    { symptom: 'Rear steps out on exit of fast corners', phase: 'exit', change: 'raise', because: 'rear cannot hold power and lateral load together' },
    { symptom: 'Losing places on straights, even with DRS', phase: 'straight', change: 'lower', because: 'this wing is most of the drag' }
  ],

  signals: [
    { channel: 'Rear tyre surface temp', look: 'Rears hotter than fronts through fast corners = rear is the limit.' },
    { channel: 'Steering trace in fast corners', look: 'Corrections against the turn (opposite lock) = rear letting go.' },
    { channel: 'Speed trap', look: 'Each click costs more here than on the front. Slow at the trap = first place to look.' },
    { channel: 'Throttle and wheelspin at low speed', look: 'Not this knob. Spinning up out of hairpins → diff on throttle.' }
  ],

  failureModes: [
    'Fixing slow-corner exit oversteer with rear wing. Below the speed where it works: drag for nothing.',
    'Adding rear wing for stability until the car understeers everywhere. Balance moved back; bring the front up with it.',
    'Ignoring DRS. Rear wing drag is refunded on DRS straights, so a track with long DRS zones tolerates more wing than its straights suggest.',
    'Tuning on cold tyres. Out-lap rear grip is about tyre temperature, not wings. Judge wing once tyres are warm.'
  ],

  examples: [
    { track: 'Austria', value: '15 to 25', position: 0.4, character: '3 long straights with DRS, 2 fast right-handers (T6, T7)', why: 'Rear steps out through T6/T7 → add wing. Getting passed on the straights → take it off. DRS softens the cost.' },
    { track: 'Bahrain', value: '20 to 30', position: 0.5, character: 'Wide, forgiving, traction out of slow corners', why: 'Exit oversteer here is mostly < 60 mph, so it is the diff and rear springs, not the wing. Run mid.' },
    { track: 'Silverstone', value: '25 to 35', position: 0.6, character: 'Fast corners back to back (Copse, Maggotts, Becketts)', why: 'Rear stability at 150+ mph is everything. Wing earns its drag here.' },
    { track: 'Monza', value: '5 to 15', position: 0.2, character: 'Four long straights, two fast corners', why: 'Lowest rear wing of the year. Every click is top speed lost on four straights.' },
    { track: 'Monaco', value: '45 to 50', position: 0.95, character: 'All slow, no straights', why: 'Max wing, hardly matters. < 75 mph it produces little. Drag is irrelevant, so why not.' }
  ]
}
