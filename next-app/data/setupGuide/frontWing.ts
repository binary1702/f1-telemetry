import { SetupGuide } from './types'

export const frontWing: SetupGuide = {
  id: 'frontWing',

  plain: [
    { tone: 'higher', steps: ['↑ wing', 'front grip ↑', 'turns in'] },
    { tone: 'lower', steps: ['↓ wing', 'front grip ↓', 'understeer'] }
  ],

  rules: [
    { when: 'Understeer in fast corners (130+ mph)', then: 'raise', do: 'add wing' },
    { when: 'Oversteer in fast corners (130+ mph)', then: 'lower', do: 'take some off' },
    { when: 'Slow on the straights', then: 'lower', do: 'take some off' },
    { when: 'Trouble in slow corners (< 60 mph)', then: 'other', do: 'not this knob → anti-roll bars, springs, camber' }
  ],

  mechanism: [
    'Wing angle → front downforce → front tyre load → front grip.',
    'Downforce ∝ speed². A click at 155 mph is ~10× the same click at 45 mph.',
    'Balance = front vs rear. ↑ front alone moves balance forward: rear lets go first.',
    'Angle = drag. Every click costs top speed; DRS buys some back, only on its straights.'
  ],

  invariant: 'Wings fix fast corners (130+ mph). Suspension and tyres (springs, anti-roll bars, camber, pressures) fix slow corners (< 60 mph). Slow corner → wrong knob.',

  interactsWith: [
    { id: 'rearWing', how: 'The difference is the balance. ↑ both = grip everywhere, speed cost. ↑ one = balance shift.' },
    { id: 'frontRideHeight', how: 'Lower nose = floor makes front downforce too → less wing needed for the same balance.' },
    { id: 'frontAntiRollBar', how: 'Same symptom, slow corners. Hairpin understeer → ARB. Fast sweeper understeer → wing.' },
    { id: 'frontToe', how: 'Also sharpens turn-in, by geometry. Works at any speed, no top speed cost.' }
  ],

  symptoms: [
    { symptom: 'Understeer on entry, fast corners (130+ mph)', phase: 'entry', change: 'raise', because: 'front unloaded at speed' },
    { symptom: 'Oversteer on turn-in, fast corners', phase: 'entry', change: 'lower', because: 'balance too far forward' },
    { symptom: 'Understeer at apex, long fast corners, front temps climbing', phase: 'apex', change: 'raise', because: 'fronts sliding and heating' },
    { symptom: 'Losing places on straights, even with DRS', phase: 'straight', change: 'lower', because: 'angle is drag you are not using' }
  ],

  signals: [
    { channel: 'Steering vs lateral G', look: 'More steering, same G = understeer. Only in fast corners = a wing problem.' },
    { channel: 'Front tyre surface temp', look: 'Fronts hotter than rears through fast corners = front is the limit.' },
    { channel: 'Speed trap', look: 'Slow at the trap, fine in corners = carrying wing you do not need.' },
    { channel: 'Throttle trace on exit', look: 'Not this knob. Exit problems → diff, rear suspension, rear wing.' }
  ],

  failureModes: [
    'Fixing slow-corner understeer with wing. Below the speed where it works: drag for nothing.',
    'Chasing balance with front wing only. Fast in corners, slow everywhere else. Bring the rear down too.',
    'Reading high-speed oversteer as a rear problem. Front is overpowering it: ↓ front is the cheaper fix.',
    'Tuning on cold tyres. Out-lap grip is about tyre temperature, not wings. Judge wing once tyres are warm.'
  ],

  // Beginner-friendly tracks first: few corners, easy to learn, clear cause and effect
  examples: [
    { track: 'Austria', value: '15 to 25', position: 0.4, character: '10 corners, 3 long straights, 2 fast right-handers (T6, T7)', why: 'Easiest place to feel it. Push in T6/T7 at 140+ mph → add wing. Slow up the hill to T3 → take it off.' },
    { track: 'Bahrain', value: '20 to 30', position: 0.5, character: 'Wide, forgiving, mix of slow and medium corners', why: 'Mostly < 100 mph, so wing does little in the corners. Run mid and learn the slow-corner knobs here instead.' },
    { track: 'Silverstone', value: '25 to 35', position: 0.6, character: 'Fast corners back to back (Copse, Maggotts, Becketts)', why: 'All > 125 mph. The track where front wing matters most and drag costs least.' },
    { track: 'Monza', value: '5 to 15', position: 0.2, character: 'Four long straights, two fast corners', why: 'Lap is mostly > 155 mph in a line. Wing is pure cost.' },
    { track: 'Monaco', value: '45 to 50', position: 0.95, character: 'All slow, no straights', why: 'Max wing, hardly matters. < 75 mph it produces little. Drag is irrelevant, so why not.' }
  ]
}
