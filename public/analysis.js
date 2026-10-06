// Lap analysis primitives. Pure functions over the distance grid written by the recorder.
// No DOM, no network: everything here takes arrays and returns arrays or rows.
//
//   grid = { stepM, d[], t[], speed[], throttle[], brake[], steer[], gear[] }   (from a lap file)
//   seg  = { n, apexD, d0, d1 }                                                  (one corner's distance window)

// ---- interpolation on a grid ----

// Index of the last grid point with d <= x (binary search), or -1 if x is before the grid.
function lowerIndex(grid, x) {
  let lo = 0, hi = grid.d.length - 1;
  if (hi < 0 || x < grid.d[0]) return -1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (grid.d[mid] <= x) lo = mid; else hi = mid - 1; }
  return lo;
}

// Linear interpolation of one channel at distance x. null outside the recorded range.
export function at(grid, channel, x) {
  const i = lowerIndex(grid, x);
  if (i < 0 || x > grid.d[grid.d.length - 1]) return null;
  if (i === grid.d.length - 1) return grid[channel][i];
  const f = (x - grid.d[i]) / (grid.d[i + 1] - grid.d[i]);
  return grid[channel][i] + (grid[channel][i + 1] - grid[channel][i]) * f;
}

// ---- outline arc length ----

// The one invariant that ties geometry to telemetry: the outline is a closed centreline in driving
// order from the start line, so fraction of its arc length == fraction of lap distance. Everything
// that maps between "where on the map" and "where in the lap" goes through this object.
//   cum[i]        arc length from the start line to outline point i (outline units)
//   total         closed-loop length
//   fracAt(i)     lap fraction of outline point i
//   pointAt(f)    [x, y] on the outline at lap fraction f (wraps)
//   nearest(x,y)  index of the closest outline point (brute force; outlines are a few hundred points)
export function outlineArc(outline) {
  const xs = outline.x, ys = outline.y, n = xs.length;
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  const total = cum[n - 1] + Math.hypot(xs[0] - xs[n - 1], ys[0] - ys[n - 1]);
  return {
    cum, total,
    fracAt: (i) => cum[i] / total,
    pointAt(f) {
      const d = (((f % 1) + 1) % 1) * total;
      let lo = 0, hi = n - 1;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (cum[mid] <= d) lo = mid; else hi = mid - 1; }
      const j = (lo + 1) % n, segLen = (lo + 1 < n ? cum[lo + 1] : total) - cum[lo];
      const t = segLen > 0 ? (d - cum[lo]) / segLen : 0;
      return [xs[lo] + (xs[j] - xs[lo]) * t, ys[lo] + (ys[j] - ys[lo]) * t];
    },
    nearest(x, y) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < n; i++) { const dd = Math.hypot(xs[i] - x, ys[i] - y); if (dd < bd) { bd = dd; best = i; } }
      return best;
    },
  };
}

// ---- corners ----

// Convert the outline's corner positions into lap-distance windows. Each window runs from the
// midpoint with the previous corner to the midpoint with the next, so the windows partition the lap.
export function cornerSegments(outline, trackLength) {
  const arc = outlineArc(outline);
  const apexes = outline.corners.map((c) => ({ n: c.n, apexD: arc.fracAt(arc.nearest(c.x, c.y)) * trackLength }))
    .sort((a, b) => a.apexD - b.apexD);

  return apexes.map((c, i) => {
    const prev = i === 0 ? apexes[apexes.length - 1].apexD - trackLength : apexes[i - 1].apexD;
    const next = i === apexes.length - 1 ? apexes[0].apexD + trackLength : apexes[i + 1].apexD;
    return { n: c.n, apexD: c.apexD, d0: Math.max(0, (prev + c.apexD) / 2), d1: Math.min(trackLength, (c.apexD + next) / 2) };
  });
}

// Where each corner starts bending, from the outline geometry: walk back from the apex until the
// road has been straight (little heading change) for STRAIGHT_M. Braking distances counted from
// here line up with the trackside boards better than distances to the apex, which sits deeper in.
// Returns one lap distance per seg (same order as segs).
export function cornerEntries(outline, segs, trackLength) {
  const arc = outlineArc(outline), n = outline.x.length;
  const dOf = (i) => arc.fracAt(i) * trackLength;
  const heading = (i) => Math.atan2(outline.y[(i + 1) % n] - outline.y[i], outline.x[(i + 1) % n] - outline.x[i]);
  const turn = (i) => { let a = heading(i) - heading((i - 1 + n) % n); while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return Math.abs(a) / Math.max(1, dOf((i + 1) % n) - dOf(i) || 8); };
  const BEND = 0.0035, STRAIGHT_M = 30; // rad per metre; radius under ~290 m counts as bending
  return segs.map((seg) => {
    // nearest outline index to the apex distance
    let i, best = 0, bd = Infinity;
    for (let k = 0; k < n; k++) { const dd = Math.abs(dOf(k) - seg.apexD); if (dd < bd) { bd = dd; best = k; } }
    i = best;
    let straightM = 0, entry = i;
    for (let steps = 0; steps < n; steps++) {
      const j = (i - 1 + n) % n;
      if (dOf(j) < seg.d0 || dOf(j) > seg.apexD) break; // never walk into the previous corner's window
      const len = Math.abs(dOf(i) - dOf(j)) || 8;
      if (turn(j) < BEND) { straightM += len; if (straightM >= STRAIGHT_M) break; } else { straightM = 0; entry = j; }
      i = j;
    }
    return dOf(entry);
  });
}

// ---- delta ----

// Time difference lap - ref at every grid point both laps cover. Positive = lap is slower.
// Both laps' t are measured from their own line crossing, so no offset is needed.
export function deltaTrace(ref, lap) {
  const d = [], delta = [];
  for (let i = 0; i < lap.d.length; i++) {
    const tr = at(ref, "t", lap.d[i]);
    if (tr === null) continue;
    d.push(lap.d[i]);
    delta.push(lap.t[i] - tr);
  }
  return { d, delta };
}

// ---- corner metrics ----

const BRAKE_ON = 0.2, BRAKE_OFF = 0.05, THROTTLE_FULL = 0.9, COAST = 0.05;

// What the driver did in one corner window.
//   time        ms spent in the window
//   minSpeed    slowest point (the real apex) and where it was
//   brakeD      first braking point before the apex
//   releaseD    where the brake came off (end of trail braking)
//   throttleD   first point after the apex at full throttle
//   coastM      metres with neither pedal pressed
//   trailM      metres braking while already turning (steer > 10%)
//   entry/exit  speed at the brake point / at the end of the window
const COVERAGE_TOLERANCE_M = 60; // a lap's grid starts/ends a few metres inside the line; allow that much shortfall

export function cornerMetrics(grid, seg) {
  const first = grid.d[0], last = grid.d[grid.d.length - 1];
  if (seg.d0 < first - COVERAGE_TOLERANCE_M || seg.d1 > last + COVERAGE_TOLERANCE_M) return null;
  const d0 = Math.max(seg.d0, first), d1 = Math.min(seg.d1, last);
  const t0 = at(grid, "t", d0), t1 = at(grid, "t", d1);
  if (t0 === null || t1 === null) return null;
  const i0 = Math.max(0, lowerIndex(grid, d0)), i1 = lowerIndex(grid, d1);

  let minSpeed = Infinity, apexD = seg.apexD;
  for (let i = i0; i <= i1; i++) if (grid.speed[i] < minSpeed) { minSpeed = grid.speed[i]; apexD = grid.d[i]; }

  let brakeD = null, releaseD = null, throttleD = null, coastM = 0, trailM = 0;
  for (let i = i0; i <= i1; i++) {
    const d = grid.d[i];
    if (grid.brake[i] > BRAKE_OFF && Math.abs(grid.steer[i]) > 0.1) trailM += grid.stepM;
    if (brakeD === null && d <= apexD && grid.brake[i] > BRAKE_ON) brakeD = d;
    if (brakeD !== null && releaseD === null && d > brakeD && grid.brake[i] < BRAKE_OFF) releaseD = d;
    if (throttleD === null && d >= apexD && grid.throttle[i] > THROTTLE_FULL) throttleD = d;
    if (grid.brake[i] < COAST && grid.throttle[i] < COAST) coastM += grid.stepM;
  }
  return {
    time: t1 - t0,
    minSpeed, apexD,
    brakeD, releaseD, throttleD, coastM, trailM,
    entrySpeed: brakeD === null ? null : at(grid, "speed", brakeD),
    exitSpeed: at(grid, "speed", d1),
  };
}

// One row per corner: the lap's metrics, the reference's, and the differences that matter.
export function compareCorners(ref, lap, segs) {
  return segs.map((seg) => {
    const r = cornerMetrics(ref, seg), l = cornerMetrics(lap, seg);
    return { seg, ref: r, lap: l, dTime: r && l ? l.time - r.time : null };
  });
}

// ---- setup groups (A/B) ----

// Median, ignoring nulls. Used instead of the mean so one spun lap does not define a setup.
export function median(xs) {
  const s = xs.filter((x) => x !== null && x !== undefined && !Number.isNaN(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Group full lap records by setup hash and summarise each group per corner. A group is "what the
// car did under one setup, over every lap you drove with it": per corner the median time, min
// speed, brake point (m before that lap's own apex), full-throttle point (m after) and coasting.
// Sorted by lap count then best time, so the two most-driven setups come first.
export function setupGroups(laps, segs) {
  const groups = new Map();
  for (const l of laps) {
    const hash = (l.tags && l.tags.setupHash) || (l.setup && l.setup.hash);
    if (!hash) continue;
    if (!groups.has(hash)) groups.set(hash, { hash, setup: l.setup, laps: [] });
    groups.get(hash).laps.push(l);
  }
  return [...groups.values()].map((g) => {
    const times = g.laps.map((l) => l.lapTimeMs);
    const corners = segs.map((seg) => {
      const ms = g.laps.map((l) => cornerMetrics(l.grid, seg)).filter(Boolean);
      return {
        n: seg.n, seg, laps: ms.length,
        time: median(ms.map((m) => m.time)),
        minSpeed: median(ms.map((m) => m.minSpeed)),
        brakeBefore: median(ms.map((m) => (m.brakeD === null ? null : m.apexD - m.brakeD))),
        throttleAfter: median(ms.map((m) => (m.throttleD === null ? null : m.throttleD - m.apexD))),
        coastM: median(ms.map((m) => m.coastM)),
      };
    });
    return { ...g, n: g.laps.length, bestMs: Math.min(...times), medianMs: median(times), corners };
  }).sort((a, b) => b.n - a.n || a.bestMs - b.bestMs);
}

// Per-corner difference B − A between two groups. Positive dTime = B slower there.
export function compareSetupGroups(a, b) {
  return a.corners.map((ca, i) => {
    const cb = b.corners[i];
    return { n: ca.n, seg: ca.seg, a: ca, b: cb, dTime: ca.time !== null && cb.time !== null ? cb.time - ca.time : null };
  });
}

// ---- consistency ----

// Per-corner spread over a set of laps. This is the driver/setup separator: with the setup held
// fixed, the spread in a corner is what the driver adds; a corner with low spread but a steady
// loss is the car's limit (or a habit). Each row carries every lap's time so the page can plot them.
//   best / median / worst   corner time over the laps
//   spread                  worst − best
//   entries                 [{ lap, time, minSpeed }] per lap that covers the corner
// sumBest is the lap you would get by driving every corner as well as your best attempt at it.
export function consistency(laps, segs) {
  const corners = segs.map((seg) => {
    const entries = laps.map((l) => ({ lap: l, m: cornerMetrics(l.grid, seg) })).filter((e) => e.m)
      .map((e) => ({ lap: e.lap, time: e.m.time, minSpeed: e.m.minSpeed }));
    const times = entries.map((e) => e.time);
    const best = times.length ? Math.min(...times) : null, worst = times.length ? Math.max(...times) : null;
    return {
      n: seg.n, seg, entries, best, worst, median: median(times),
      bestLap: entries.find((e) => e.time === best)?.lap ?? null,
      spread: best === null ? null : worst - best,
    };
  });
  const covered = corners.filter((c) => c.best !== null);
  return {
    corners,
    sumBest: covered.reduce((t, c) => t + c.best, 0),
    sumMedian: covered.reduce((t, c) => t + c.median, 0),
    allCovered: covered.length === corners.length,
  };
}

// ---- balance ----
//
// The physics: in steady cornering the body yaws exactly as fast as the path turns, whatever the
// balance, so yawRate == aLat / v. The difference is the rate the body slip angle is changing:
//   slipRate = (yawRate − aLat / v) · turnSign
//   > 0  body rotating faster than the path  → rear sliding  → oversteer
//   < 0  body rotating slower than the path  → front washing → understeer
// The game's yaw sign convention is not documented, so it is calibrated from the data: during
// steady cornering yaw rate and lateral g share a turn direction.
//
// Steady understeer does not show in slipRate (the car simply follows a wider path), so it is
// read from steering effort instead: steer per g of lateral acceleration at the apex. More lock for
// the same lateral g = the front is giving less = more understeer. Only meaningful lap vs lap on
// the same corner, where the path radius is roughly the same.

const G = 9.81, SLIDE_RATE = 0.3, SLIDE_MIN_M = 10, CORNER_G = 1.0;

export function hasBalance(grid) { return Array.isArray(grid.gLat) && Array.isArray(grid.yawRate) && grid.gLat.length === grid.d.length; }

// +1 or −1: sign that makes yawRate agree with gLat's turn direction.
export function yawSignOf(grid) {
  let s = 0;
  for (let i = 0; i < grid.d.length; i++) if (Math.abs(grid.gLat[i]) > CORNER_G) s += Math.sign(grid.gLat[i]) * Math.sign(grid.yawRate[i]);
  return s < 0 ? -1 : 1;
}

export function slipRateAt(gLat, yawRate, speedKmh, yawSign) {
  const v = speedKmh / 3.6;
  if (v < 10 || Math.abs(gLat) < CORNER_G) return null;
  return (yawRate * yawSign - (gLat * G) / v) * Math.sign(gLat);
}

// Per corner window: peak lateral g, steer per g at the apex region, and slide events either way.
export function balanceMetrics(grid, seg, yawSign) {
  if (!hasBalance(grid)) return null;
  const i0 = Math.max(0, lowerIndex(grid, seg.d0)), i1 = lowerIndex(grid, seg.d1);
  if (i1 < i0) return null;
  let peakLatG = 0, steerSum = 0, gSum = 0, rear = 0, front = 0, run = 0, runM = 0;
  for (let i = i0; i <= i1; i++) {
    const g = Math.abs(grid.gLat[i]);
    if (g > peakLatG) peakLatG = g;
    if (g > 1.5) { steerSum += Math.abs(grid.steer[i]); gSum += g; }
    const sr = slipRateAt(grid.gLat[i], grid.yawRate[i], grid.speed[i], yawSign);
    const dir = sr === null ? 0 : sr > SLIDE_RATE ? 1 : sr < -SLIDE_RATE ? -1 : 0;
    if (dir && dir === run) runM += grid.stepM;
    else { if (run && runM >= SLIDE_MIN_M) run > 0 ? rear++ : front++; run = dir; runM = dir ? grid.stepM : 0; }
  }
  if (run && runM >= SLIDE_MIN_M) run > 0 ? rear++ : front++;
  return { peakLatG, steerPerG: gSum > 0 ? steerSum / gSum : null, rearSlides: rear, frontSlides: front };
}

// Per-setup balance: medians of balanceMetrics over the laps of a group that carry the channels.
// Returns null when no lap in the group has them.
export function groupBalance(laps, segs) {
  const withB = laps.filter((l) => hasBalance(l.grid)).map((l) => ({ grid: l.grid, ys: yawSignOf(l.grid) }));
  if (!withB.length) return null;
  return segs.map((seg) => {
    const ms = withB.map((l) => balanceMetrics(l.grid, seg, l.ys)).filter(Boolean);
    return {
      n: seg.n, laps: ms.length,
      peakLatG: median(ms.map((m) => m.peakLatG)),
      steerPerG: median(ms.map((m) => m.steerPerG)),
      rearSlides: median(ms.map((m) => m.rearSlides)),
      frontSlides: median(ms.map((m) => m.frontSlides)),
    };
  });
}

// ---- braking events: the sequence a corner is made of ----
//
// Works on any trace with parallel arrays d, speed, throttle, brake, steer (a lap grid, or the
// live samples of one lap). Metres are measured from d itself, so the sample spacing does not
// matter. Everything is a lap distance (m) or a pedal fraction (0..1).
//
//   brakeStartD   brake first above BRAKE_ON
//   peakBrake     highest brake in the window, at peakD
//   riseM         metres from brake start to peak (short = hard initial hit)
//   releaseStartD first point after the peak where brake drops below 85% of peak
//   releaseEndD   brake below BRAKE_OFF after that
//   releaseM      releaseEnd − releaseStart (short = abrupt, long = progressive)
//   turnInD       |steer| first above TURN_IN after brake start (or before apex if no braking)
//   brakeAtTurnIn brake fraction at turn-in
//   steerAtRelease |steer| when the release began
//   apexD         slowest point, minSpeed km/h, brakeAtApex
//   overlapM      metres with brake > BRAKE_OFF and |steer| > STEERING (trail braking)
//   deepM         metres past the apex still braking above 0.1
//   pickupD       throttle first above 0.2 after the apex; fullD first above 0.9
//   apexToPickup  pickupD − apexD
const TURN_IN = 0.15, STEERING = 0.1;

export function brakeEvents(tr, seg) {
  const n = tr.d.length;
  let i0 = 0; while (i0 < n && tr.d[i0] < seg.d0) i0++;
  let i1 = i0; while (i1 + 1 < n && tr.d[i1 + 1] <= seg.d1) i1++;
  if (i1 - i0 < 3) return null;
  const step = (i) => (i > i0 ? tr.d[i] - tr.d[i - 1] : 0);

  let apexI = i0; for (let i = i0; i <= i1; i++) if (tr.speed[i] < tr.speed[apexI]) apexI = i;
  const apexD = tr.d[apexI];

  let brakeStartI = -1, peakI = -1, peak = 0;
  for (let i = i0; i <= apexI; i++) {
    if (brakeStartI < 0 && tr.brake[i] > BRAKE_ON) brakeStartI = i;
    if (brakeStartI >= 0 && tr.brake[i] > peak) { peak = tr.brake[i]; peakI = i; }
  }
  let releaseStartI = -1, releaseEndI = -1;
  if (peakI >= 0) for (let i = peakI; i <= i1; i++) {
    if (releaseStartI < 0 && tr.brake[i] < peak * 0.85) releaseStartI = i;
    if (releaseStartI >= 0 && tr.brake[i] < BRAKE_OFF) { releaseEndI = i; break; }
  }
  let turnInI = -1;
  for (let i = brakeStartI >= 0 ? brakeStartI : i0; i <= i1; i++) if (Math.abs(tr.steer[i]) > TURN_IN) { turnInI = i; break; }

  let overlapM = 0, deepM = 0;
  for (let i = i0 + 1; i <= i1; i++) {
    if (tr.brake[i] > BRAKE_OFF && Math.abs(tr.steer[i]) > STEERING) overlapM += step(i);
    if (i > apexI && tr.brake[i] > 0.1) deepM += step(i);
  }
  let pickupI = -1, fullI = -1, lifts = 0, peakT = 0;
  for (let i = apexI; i <= i1; i++) {
    if (pickupI < 0 && tr.throttle[i] > 0.2) pickupI = i;
    if (pickupI >= 0 && fullI < 0) { // on the way up to full throttle: a drop of 15% from the peak so far is a lift
      if (tr.throttle[i] > peakT) peakT = tr.throttle[i]; else if (peakT - tr.throttle[i] > 0.15) { lifts++; peakT = tr.throttle[i]; }
    }
    if (fullI < 0 && tr.throttle[i] > 0.9) fullI = i;
  }
  const D = (i) => (i < 0 ? null : tr.d[i]);
  return {
    n: seg.n,
    brakeStartD: D(brakeStartI), peakBrake: peakI < 0 ? 0 : peak, peakD: D(peakI),
    riseM: brakeStartI >= 0 && peakI >= 0 ? tr.d[peakI] - tr.d[brakeStartI] : null,
    releaseStartD: D(releaseStartI), releaseEndD: D(releaseEndI),
    releaseM: releaseStartI >= 0 && releaseEndI >= 0 ? tr.d[releaseEndI] - tr.d[releaseStartI] : null,
    turnInD: D(turnInI), brakeAtTurnIn: turnInI < 0 ? null : tr.brake[turnInI],
    steerAtRelease: releaseStartI < 0 ? null : Math.abs(tr.steer[releaseStartI]),
    apexD, minSpeed: tr.speed[apexI], brakeAtApex: tr.brake[apexI],
    overlapM, deepM,
    pickupD: D(pickupI), fullD: D(fullI),
    apexToPickup: pickupI < 0 ? null : tr.d[pickupI] - apexD,
    riseM: pickupI >= 0 && fullI >= 0 ? tr.d[fullI] - tr.d[pickupI] : null, // metres from first gas to full gas
    lifts,
    braking: brakeStartI >= 0,
  };
}

// ---- coaching: one finding per corner, deterministic ----
//
// cur = this attempt, ref = the reference lap's events for the same corner, prev = the previous
// attempt (or null). Priority is fixed: the first rule that fires is the finding. Wording is for a
// controller: it talks about easing the brake off, never about holding percentages.
//   code    machine id of the finding (used to measure "better" next time)
//   title   short label for the card
//   what    what the telemetry saw
//   next    the one thing to try next lap
//   metric  { name, cur, ref, prev, betterWhen: "higher" | "lower" } the number this lesson moves
export function coachBraking(cur, ref) {
  if (!cur || !ref) return null;
  const m = (name, c, r, betterWhen) => ({ name, cur: c, ref: r, betterWhen });
  const mph = (v) => Math.round(v * 0.621371), r = Math.round;
  if (!ref.braking) { // flat corner on the best lap: the only question is whether you lifted
    if (cur.minSpeed < ref.minSpeed - 5)
      return { code: "lift", title: "LIFTED", what: `${mph(cur.minSpeed)} mph, best lap is flat at ${mph(ref.minSpeed)} mph.`, next: "Stay flat.", metric: m("apex speed (mph)", mph(cur.minSpeed), mph(ref.minSpeed), "higher") };
    return { code: "good", title: "GOOD", what: "", next: "Keep this.", metric: m("apex speed (mph)", mph(cur.minSpeed), mph(ref.minSpeed), "higher") };
  }
  if (!cur.braking)
    return { code: "no-brake", title: "NO BRAKING", what: `Best lap brakes ${r(ref.apexD - ref.brakeStartD)} m before the apex.`, next: "Brake here.", metric: m("apex speed (mph)", mph(cur.minSpeed), mph(ref.minSpeed), "higher") };
  if (cur.deepM > 10 && ref.deepM < 5)
    return { code: "too-deep", title: "BRAKING TOO LONG", what: `Still braking ${r(cur.deepM)} m after the apex.`, next: "Off the brake by the apex.", metric: m("braking after apex (m)", cur.deepM, ref.deepM, "lower") };
  if (cur.releaseM !== null && ref.releaseM !== null && cur.releaseM < 10 && ref.releaseM >= 20)
    return { code: "abrupt-release", title: "LET GO TOO FAST", what: `Brake off in ${r(cur.releaseM)} m, best eases off over ${r(ref.releaseM)} m.`, next: "Ease the brake off slowly while turning in.", metric: m("brake release (m)", cur.releaseM, ref.releaseM, "higher") };
  if (ref.overlapM >= 15 && cur.overlapM < ref.overlapM * 0.5)
    return { code: "early-release", title: "LET GO TOO EARLY", what: `${r(cur.overlapM)} m of brake while turning, best ${r(ref.overlapM)} m.`, next: "Keep a little brake on as you turn in.", metric: m("brake while turning (m)", cur.overlapM, ref.overlapM, "higher") };
  if (ref.overlapM >= 15 && cur.overlapM > ref.overlapM * 1.6)
    return { code: "over-trail", title: "BRAKING TOO LONG INTO THE TURN", what: `${r(cur.overlapM)} m of brake while turning, best ${r(ref.overlapM)} m.`, next: "Off the brake sooner after turning in.", metric: m("brake while turning (m)", cur.overlapM, ref.overlapM, "lower") };
  if (cur.brakeStartD !== null && ref.brakeStartD !== null && cur.brakeStartD < ref.brakeStartD - 20)
    return { code: "early-brake", title: "BRAKED TOO EARLY", what: `${r(ref.brakeStartD - cur.brakeStartD)} m before the best lap's brake point.`, next: `Brake ${r(ref.brakeStartD - cur.brakeStartD)} m later.`, metric: m("brake point (m before apex)", cur.apexD - cur.brakeStartD, ref.apexD - ref.brakeStartD, "lower") };
  if (cur.minSpeed < ref.minSpeed - 8)
    return { code: "overslowed", title: "TOO SLOW IN THE MIDDLE", what: `${mph(cur.minSpeed)} mph at the apex, best ${mph(ref.minSpeed)} mph.`, next: "Same brake point, a little less brake.", metric: m("apex speed (mph)", mph(cur.minSpeed), mph(ref.minSpeed), "higher") };
  if (cur.apexToPickup !== null && ref.apexToPickup !== null && cur.apexToPickup > ref.apexToPickup + 15)
    return { code: "late-throttle", title: "GAS TOO LATE", what: `Gas ${r(cur.apexToPickup)} m after the apex, best ${r(ref.apexToPickup)} m.`, next: "On the gas as soon as the brake is off.", metric: m("apex to gas (m)", cur.apexToPickup, ref.apexToPickup, "lower") };
  if (cur.lifts >= 1 && ref.lifts === 0)
    return { code: "exit-lift", title: "LIFTED ON THE EXIT", what: `Came off the gas ${cur.lifts === 1 ? "once" : cur.lifts + " times"} on the way out.`, next: "Once on the gas, stay on it.", metric: m("lifts on exit", cur.lifts, ref.lifts, "lower") };
  if (cur.riseM !== null && ref.riseM !== null && cur.riseM > ref.riseM + 25)
    return { code: "slow-throttle", title: "SLOW ON THE GAS", what: `Full gas ${r(cur.riseM)} m after first touching it, best ${r(ref.riseM)} m.`, next: "Squeeze up to full gas quicker once the car is straight.", metric: m("gas to full (m)", cur.riseM, ref.riseM, "lower") };
  return { code: "good", title: "GOOD", what: "", next: "Keep this.", metric: m("brake while turning (m)", cur.overlapM, ref.overlapM, "higher") };
}

// The number a finding is about, read from any attempt's events (so attempts can be compared).
export function metricValue(code, ev) {
  if (!ev) return null;
  switch (code) {
    case "no-brake": case "overslowed": return ev.minSpeed * 0.621371;
    case "too-deep": return ev.deepM;
    case "abrupt-release": return ev.releaseM;
    case "early-release": case "over-trail": case "good": return ev.overlapM;
    case "early-brake": return ev.brakeStartD === null ? null : ev.apexD - ev.brakeStartD;
    case "late-throttle": return ev.apexToPickup;
    case "lift": return ev.minSpeed * 0.621371;
    case "exit-lift": return ev.lifts;
    case "slow-throttle": return ev.riseM;
    default: return null;
  }
}

// Progress on one finding between two attempts: "better", "worse", "same" with the numbers.
export function progress(finding, prevCur) {
  if (!finding || prevCur === null || prevCur === undefined || finding.metric.cur === null) return null;
  const a = prevCur, b = finding.metric.cur, dir = finding.metric.betterWhen === "higher" ? 1 : -1;
  const d = (b - a) * dir;
  const tol = Math.max(2, Math.abs(finding.metric.ref ?? 0) * 0.1);
  return { verdict: d > tol ? "better" : d < -tol ? "worse" : "same", from: a, to: b };
}

// Pick the one corner to work on: the worst non-"good" finding by how far its metric is from the
// reference, relative to the reference. Returns { n, finding } or null.
export function pickLesson(findings) {
  let best = null, score = 0;
  for (const f of findings) {
    if (!f.finding || f.finding.code === "good") continue;
    const { cur, ref } = f.finding.metric;
    const s = ref ? Math.abs((cur ?? 0) - ref) / Math.max(1, Math.abs(ref)) : 1;
    if (s > score) { score = s; best = f; }
  }
  return best;
}

// ---- session lesson: one thing to work on, from every lap of the session ----
//
// laps = [[{ n, dTime, finding, ev }, ...], ...]   one array per lap, as the coach page keeps them
// Per corner: median time lost, spread (p90 − p10), and the most common finding that is not "good".
//   primary      the corner with the biggest median loss whose top finding repeats on 30%+ of laps
//                (falls back to the biggest median loss with whatever finding it has)
//   inconsistent the corner with the biggest spread, when that spread is over 500 ms
export function sessionLesson(laps) {
  const by = {};
  for (const lap of laps) for (const a of lap) {
    const b = (by[a.n] ??= { n: a.n, ds: [], codes: {}, sample: {}, metric: {} });
    b.ds.push(a.dTime);
    if (a.finding) {
      b.codes[a.finding.code] = (b.codes[a.finding.code] || 0) + 1;
      b.sample[a.finding.code] = a.finding;
      (b.metric[a.finding.code] ??= []).push(metricValue(a.finding.code, a.ev));
    }
  }
  const q = (xs, p) => { const s = xs.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
  const corners = Object.values(by).filter((b) => b.ds.length >= 2).map((b) => {
    const total = b.ds.length;
    const top = Object.entries(b.codes).filter(([c]) => c !== "good").sort((x, y) => y[1] - x[1])[0] || null;
    return {
      n: b.n, laps: total, median: median(b.ds), p10: q(b.ds, 0.1), p90: q(b.ds, 0.9), spread: q(b.ds, 0.9) - q(b.ds, 0.1),
      code: top ? top[0] : null, share: top ? top[1] / total : 0, finding: top ? b.sample[top[0]] : null,
      metricMedian: top ? median(b.metric[top[0]]) : null, metricRef: top ? b.sample[top[0]].metric.ref : null,
    };
  });
  const repeating = corners.filter((c) => c.code && c.share >= 0.3 && c.median > 50).sort((x, y) => y.median - x.median);
  const primary = repeating[0] || corners.filter((c) => c.median > 50).sort((x, y) => y.median - x.median)[0] || null;
  const inconsistent = corners.filter((c) => c.spread > 500).sort((x, y) => y.spread - x.spread)[0] || null;
  return { corners, primary, inconsistent };
}

// ---- racing line ----
//
// The game gives the car's world position (x, z in metres). The outline is in another frame and
// scale. A similarity transform (rotate, scale, translate) maps one onto the other; it is fitted
// by least squares from the pairs (car position at lap distance d) ↔ (outline point at d), which
// any complete lap with positions provides. After that every lap's path lands on the outline.

export function hasLine(grid) { return Array.isArray(grid.x) && grid.x.length === grid.d.length && grid.x.some((v) => v !== 0); }

// Umeyama / Procrustes in 2D: world (x, z) → outline (X, Y).
export function fitWorld(grid, outline, trackLength) {
  const arc = outlineArc(outline);
  const src = [], dst = [];
  for (let i = 0; i < grid.d.length; i += 2) {
    if (grid.x[i] === 0 && grid.z[i] === 0) continue;
    src.push([grid.x[i], grid.z[i]]); dst.push(arc.pointAt(grid.d[i] / trackLength));
  }
  const n = src.length; if (n < 20) return null;
  const mean = (p) => p.reduce((a, q) => [a[0] + q[0] / n, a[1] + q[1] / n], [0, 0]);
  const ms = mean(src), md = mean(dst);
  let sxx = 0, sxy = 0, syx = 0, syy = 0, varS = 0;
  for (let i = 0; i < n; i++) {
    const a = [src[i][0] - ms[0], src[i][1] - ms[1]], b = [dst[i][0] - md[0], dst[i][1] - md[1]];
    sxx += a[0] * b[0]; sxy += a[0] * b[1]; syx += a[1] * b[0]; syy += a[1] * b[1]; varS += a[0] * a[0] + a[1] * a[1];
  }
  // allow a reflection: the game's z axis may be mirrored relative to the outline's y
  const solve = (flip) => {
    const f = flip ? -1 : 1; // flip = mirror z before fitting
    const A = sxx, B = sxy, C = syx * f, D = syy * f; // cross-covariance with mirrored source
    const ang = Math.atan2(B - C, A + D);
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const s = ((A + D) * cos + (B - C) * sin) / varS;
    const tx = md[0] - s * (cos * ms[0] - sin * (ms[1] * f)), ty = md[1] - s * (sin * ms[0] + cos * (ms[1] * f));
    const fit = { s, cos, sin, tx, ty, flip: f };
    let err = 0; for (let i = 0; i < n; i++) { const p = applyFit(fit, src[i][0], src[i][1]); err += Math.hypot(p[0] - dst[i][0], p[1] - dst[i][1]); }
    return { ...fit, err: err / n };
  };
  const a = solve(false), b = solve(true);
  return a.err <= b.err ? a : b;
}
export function applyFit(fit, x, z) {
  const zz = z * fit.flip;
  return [fit.s * (fit.cos * x - fit.sin * zz) + fit.tx, fit.s * (fit.sin * x + fit.cos * zz) + fit.ty];
}

// Signed lateral offset from the centreline, in metres, at every grid point: positive = left of
// the direction of travel. Needs a fit. Returns null where there is no position.
export function lineOffsets(grid, outline, trackLength, fit) {
  const arc = outlineArc(outline);
  return grid.d.map((d, i) => {
    if (grid.x[i] === 0 && grid.z[i] === 0) return null;
    const p = applyFit(fit, grid.x[i], grid.z[i]);
    const c = arc.pointAt(d / trackLength), c2 = arc.pointAt((d + 4) / trackLength);
    const tx = c2[0] - c[0], ty = c2[1] - c[1], tl = Math.hypot(tx, ty) || 1;
    const cross = (tx / tl) * (p[1] - c[1]) - (ty / tl) * (p[0] - c[0]); // + = left of travel
    return cross / fit.s; // outline units → metres
  });
}

// Which way a corner turns at its apex: +1 left, −1 right (from the outline's heading change).
export function turnSign(outline, trackLength, apexD) {
  const arc = outlineArc(outline);
  const a = arc.pointAt((apexD - 30) / trackLength), b = arc.pointAt(apexD / trackLength), c = arc.pointAt((apexD + 30) / trackLength);
  const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
  return cross > 0 ? 1 : -1;
}

// Line metrics for one corner: lateral position (metres toward the inside, + = tighter) at the
// brake point, the apex and the exit (full throttle). offsets = lineOffsets(...) of that lap.
export function lineMetrics(grid, offsets, ev, sign) {
  if (!ev) return null;
  const at = (d) => { if (d === null) return null; let k = 0; while (k + 1 < grid.d.length && grid.d[k + 1] <= d) k++; const o = offsets[k]; return o === null || o === undefined ? null : o * sign; };
  return { entry: at(ev.brakeStartD ?? ev.apexD - 80), apex: at(ev.apexD), exit: at(ev.fullD ?? ev.pickupD) };
}

// One line finding, or null. inside values are metres toward the inside of the corner.
export function coachLine(cur, ref) {
  if (!cur || !ref || cur.apex === null || ref.apex === null) return null;
  const r = Math.round, dA = ref.apex - cur.apex; // + = you were further out at the apex
  if (dA > 1.5) return { code: "wide-apex", title: "MISSED THE APEX", what: `${dA.toFixed(1)} m wider than your best lap at the apex.`, next: `Get ${r(dA)} m closer to the inside at the apex.`, metric: { name: "apex, m from best line", cur: dA, ref: 0, betterWhen: "lower" } };
  if (dA < -1.5 && cur.exit !== null && ref.exit !== null && ref.exit - cur.exit < -1.5) return { code: "tight-apex", title: "TOO TIGHT AT THE APEX", what: `${(-dA).toFixed(1)} m tighter than your best lap, then wide on the exit.`, next: "Turn in a touch later so the car is straighter on the exit.", metric: { name: "apex, m from best line", cur: -dA, ref: 0, betterWhen: "lower" } };
  if (cur.entry !== null && ref.entry !== null && cur.entry - ref.entry > 2) return { code: "tight-entry", title: "ENTERED TOO TIGHT", what: `${(cur.entry - ref.entry).toFixed(1)} m closer to the inside at the brake point than your best lap.`, next: "Use the full width before turning in.", metric: { name: "entry, m from best line", cur: cur.entry - ref.entry, ref: 0, betterWhen: "lower" } };
  return null;
}

// ---- whole-lap style metrics ----

// Numbers that describe HOW a lap was driven, independent of any reference.
//   coastM         metres with no pedal pressed
//   trailM         metres braking while already turning (steer > 10%)
//   brakePeak      mean of the peak brake pressure per braking zone
//   throttleSpikes count of throttle lifts of > 20% while above 50% (hesitation / wheelspin catches)
//   steerReversals steering direction changes per km with amplitude > 5%
export function styleMetrics(grid) {
  let coastM = 0, trailM = 0, peaks = [], peak = 0, braking = false, spikes = 0, reversals = 0, lastDir = 0;
  for (let i = 0; i < grid.d.length; i++) {
    const b = grid.brake[i], th = grid.throttle[i], s = grid.steer[i];
    if (b < COAST && th < COAST) coastM += grid.stepM;
    if (b > BRAKE_OFF && Math.abs(s) > 0.1) trailM += grid.stepM;
    if (b > BRAKE_ON) { braking = true; peak = Math.max(peak, b); } else if (braking) { peaks.push(peak); peak = 0; braking = false; }
    if (i > 0 && grid.throttle[i - 1] > 0.5 && grid.throttle[i - 1] - th > 0.2) spikes++;
    if (i > 0) { const ds = s - grid.steer[i - 1]; const dir = Math.abs(ds) > 0.05 ? Math.sign(ds) : 0; if (dir && lastDir && dir !== lastDir) reversals++; if (dir) lastDir = dir; }
  }
  const km = (grid.d[grid.d.length - 1] - grid.d[0]) / 1000 || 1;
  return { coastM, trailM, brakePeak: peaks.length ? peaks.reduce((a, b) => a + b, 0) / peaks.length : 0, throttleSpikes: spikes, steerReversalsPerKm: reversals / km };
}
