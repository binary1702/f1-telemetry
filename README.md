# f1-telemetry

Minimal prototype: F1 25 (PS5) UDP telemetry -> Node -> WebSocket -> browser.

```
PS5 --UDP :20777--> src/udp-server.ts --> src/decoder/ --> src/server.ts --WS--> public/index.html
```

## Run

```bash
npm install
npm run dev     # restarts on file changes
# or: npm start
```

Then open http://localhost:3000 and drive.

Stop any `nc -u -l 20777` first, or the UDP bind fails.

Ports: `PORT` (HTTP, default 3000) and `F1_UDP_PORT` (UDP, default 20777) can be overridden, e.g. `PORT=3001 npm start`.

## Test without the PS5

In a second terminal:

```bash
npm run fake
```

Sends synthetic Car Telemetry packets (playerCarIndex = 3) at 20 Hz.

## Decoder

Offsets are taken from "Data Output from F1 25 v3" (EA). Each packet type is one module in
`src/decoder/`, with its byte layout documented at the top of the file:

| Packet | ID | Size | Module | Used for |
|---|---|---|---|---|
| Motion | 0 | 1349 | motion.ts | player G-force (car world positions decoded, unused for now) |
| Session | 1 | 753 | session.ts | track id/name, length, total laps, temps |
| Lap Data | 2 | 1285 | lapData.ts | race position, lap number, lap distance, lap times, sector, gaps |
| Car Telemetry | 6 | 1352 | carTelemetry.ts | speed, gear, RPM, throttle, brake, steer, DRS, tyre/brake temps, pressures |
| Car Status | 7 | 1239 | carStatus.ts | fuel, fuel laps, mix, tyre compound/age, ERS, DRS allowed, brake bias |
| Car Setups | 5 | 1133 | carSetups.ts | garage settings for the player car, plus a hash to group laps by setup |
| Session History | 11 | 1460 | sessionHistory.ts | official per-lap sector times and best-lap markers |

## Lap recorder

`src/recorder/lapRecorder.ts` turns the stream into one JSON file per completed lap:

```
laps/<trackId>-<track>/<sessionUID>/lap-003-1m04.812.json
```

Each file holds:

- `lapTimeMs`, `sectorsMs`, `valid`, `flags` (`invalid`, `pit`, `flashback`, `incomplete`)
- `tags`: tyre compound and age, fuel at start and end, ERS mode, setup hash
- `setup`: the full Car Setups snapshot
- `grid`: every channel resampled every 5 m of lap distance (time, speed, throttle, brake, steer, gear)
- `samples`: the raw 20 Hz samples keyed by lap distance

The grid is what makes laps comparable: index k of any two laps on the same track is the same
point on the road, so delta time, corner times and setup comparisons are plain array arithmetic.

Flashbacks are detected as lap distance jumping backwards; the overwritten samples are dropped
and the lap is flagged. Set `LAPS_DIR` to write elsewhere.

To exercise the recorder without the game, shorten the fake lap:

```bash
FAKE_LAP_SECONDS=8 npm run fake
```

## Compare page

http://localhost:3000/compare reads the recorded laps (`/api/laps`, `/api/lap?f=`) and shows:

1. **Delta trace**: `t_lap(d) − t_ref(d)` along distance. Rising = losing time there. Red where rising, green where falling.
2. **Corner table**: one row per corner. Corner windows come from the outline's corner positions
   converted to lap distance (midpoint to midpoint, so they partition the lap). Per corner: time,
   min speed, brake point (m before apex), full-throttle point (m after apex), coasting metres.
3. **Trace overlay**: speed, throttle, brake, steer for both laps; click a corner row to zoom.
4. **Style metrics**: coasting, trail braking, brake peak, throttle lifts, steering reversals.
5. **Track map**: the outline with the delta slope painted onto the road (red losing, green
   gaining). Clicking a corner number or table row zooms the traces and lights that corner's
   window on the map; hovering the map, delta or traces shows the same lap distance in all of them.
6. **Setup**: both laps' garage setups side by side, differences highlighted.
7. **Setup A/B**: every lap on the track grouped by setup hash (`setupGroups` in `analysis.js`).
   Per group, per corner: median time, min speed, brake point, full-throttle point, coasting.
   Pick two groups and the page lists where B gains or loses versus A and which garage fields
   differ. It only reports what the recorded laps measured; nothing is inferred.

8. **Consistency**: pick laps (default: those sharing this lap's setup) and see per corner the
   best, median, worst and spread (`consistency` in `analysis.js`), plus a strip with one dot per
   lap. Spread under one setup is what the driver adds lap to lap. The best corners stitched
   together give the lap time already demonstrated piecewise.

The corner table defaults to biggest time loss first; TRACK ORDER switches back to lap order.

## Live coach

The live page loads the best recorded lap on the current track as a reference and shows, from
the Lap Data and Car Telemetry streams:

- **Live Δ**: your current lap time minus the reference's time at the same lap distance.
- **Next corner**: distance to the apex, metres until the reference's brake point, the reference's
  minimum speed and where it was back on full throttle.
- **Corner log**: as you leave each corner window, your time, min speed and brake point against
  the reference's. Corner numbers on the map turn red or green with the result.
- **Brake points** on the map: hollow dots where the reference started braking for each corner.

The reference is refreshed on every completed lap, so beating it makes the new lap the target.
It is defined once, server side, at `/api/reference?track=<id>&validOnly=0|1`: the quickest lap
with full coverage; "invalid" and "flashback" flags (mostly restart artefacts) do not disqualify
unless VALID ONLY is on. Both pages read it from there.

On the live map, this lap's delta is painted on the road behind the car (red losing, green
gaining), passed corners turn purple (quicker than the reference), green (close) or yellow
(slower) with the delta under the number, your brake and full-throttle points are drawn as red
and green dots next to the reference's hollow brake dots, and OS/US badges mark where the balance
detector saw oversteer or understeer. A second delta against the quickest lap of
the current session appears when that differs from the track best. The coach arms only when a
lap is seen starting from the line, so restarts and mid-lap page loads show blank deltas until
the next crossing. Corner labels on the map are grey until you leave the corner, then show the
delta.

The laps table hides laps more than 3 s off the best. VALID ONLY (both pages, remembered in the
browser) hides invalid, flashback and incomplete laps everywhere, including the reference choice.
The server recovers the session's laps from disk on startup, so a restart mid-session keeps them.

## Pages

| URL | What |
|---|---|
| `/` | Coach: gap, speed, next corner strip, map, last corner strips, one lesson. Switches to a lap report when the game pauses (packets stop) or on the LAP REPORT button. |
| `/live` | Full telemetry: every channel, traces, laps, setup, balance. |
| `/compare` | Two recorded laps side by side. |
| `/setups` | Setups grouped by hash, A/B. |

The lap report shows the finished lap's time against the best, the map with that lap's delta
painted, a bar per corner of time lost (click one to see that corner on a piece of the map with
a tick list), and the lesson. It also lists every recorded lap on the track within 2 s of the
best (or every lap of the current session, with the toggle); clicking one loads it as the
report, judged corner by corner the same way as a live lap. With no game running, the page opens
in that review mode on the newest recorded session. SAVE REPORT posts the judged report to
`/api/report`, which writes `reports/<track>/<session>/<lap>.report.json` (per-corner findings,
events, the lesson). The telemetry itself is always in `laps/`.

## Coaching layer (Phase 1)

The live page has an interpretation layer on top of the traces, all in `analysis.js`:

```
trace {d, speed, throttle, brake, steer}  (a lap grid, or this lap's live samples)
  └─ brakeEvents(trace, seg)   → the corner's sequence: brake start, peak, release start/end,
                                  turn-in, apex, throttle pickup, brake/steer overlap, braking past apex
      └─ coachBraking(cur, ref) → ONE finding, fixed priority: no-brake, too-deep, abrupt-release,
                                  early-release, over-trail, early-brake, overslowed, late-throttle, good
          └─ progress(...)      → better / worse / same on that finding's metric vs the previous attempt
          └─ pickLesson(...)    → the one corner to work on after a full lap
```

Exit rules read the throttle after the apex (pickup, metres to full throttle, lifts on the way
up); flat corners get a lift rule. `sessionLesson` aggregates every judged lap of the session:
per corner the median loss, the spread (p90 − p10) and the most common finding, and picks the
corner with the biggest typical loss whose finding repeats on 30%+ of laps, plus the most
inconsistent corner when its spread is over half a second. The coach page shows that as WORK ON
THIS, with typical / now / best bars.

Wording is deterministic and written for a controller (ease the brake off, not hold 17%).
Every attempt at every corner is kept for the session, so the second attempt at T3 is judged
against the reference and reported as progress against the first.

On the page: NEXT CORNER shows the reference's sequence (brake, turn-in, trail metres, apex speed,
throttle) and your last finding there; ONE THING is the lesson for the next lap, updated with
BETTER / WORSE / SAME when you attempt that corner again; CORNER REVIEW (click a corner on the
map, click again to unpin) draws brake, steering and throttle for the current attempt over the
reference with BRAKE, TURN-IN, APEX and GAS marked and the brake+steer overlap shaded, plus a
current-vs-best table and the finding.

The map canvas follows its box and fits the outline with one uniform scale, so it never distorts.

## Setups page

http://localhost:3000/setups is the setup view: every setup hash driven on a track as one column
(laps, best, median, every garage field, differences from A in orange), an A vs B comparison with
per-corner time, inputs and balance medians (`setupGroups`, `compareSetupGroups`, `groupBalance`
in `analysis.js`), and the laps listed by setup. Click a column header to make it A, shift+click
for B. Defaults are the two setups with the quickest laps. VALID ONLY is shared with the other
pages.

## Racing line

The recorder stores the player's world position (`x`, `z`, metres) in samples and on the grid
(laps recorded before this have none). The outline is in another frame, so `fitWorld` in
`analysis.js` fits a similarity transform (rotation, scale, translation, optional mirror) by least
squares from any complete lap with positions, pairing the car's position at lap distance d with
the outline point at d. `lineOffsets` then gives the signed lateral offset from the centreline in
metres for every grid point, and `lineMetrics` reads it at the brake point, apex and exit, signed
toward the inside of the corner (`turnSign`). `coachLine` compares two laps' line metrics and
reports MISSED THE APEX, TOO TIGHT AT THE APEX or ENTERED TOO TIGHT; the coach uses it when the
braking rules find nothing. On the coach page the line reference is the quickest recorded lap
that has positions (shown as "line L<n>" in the header); its line is drawn grey on the map and in
the corner picture, your line in white on the map and coloured by pedal state in the corner
picture. Absolute offsets carry a bias of about a metre from the fit; differences between two
laps under the same fit do not, which is what the rules use.

## Balance

Motion packets carry lateral g and yaw; the server derives yaw rate from consecutive packets and
the recorder stores `gLat`, `gLong` and `yawRate` on the grid (laps recorded before this have no
balance data). The physics (`balance` section of `analysis.js`): in steady cornering the body yaws
exactly as fast as the path turns, so `yawRate == aLat / v` whatever the balance. The difference is
the rate the slip angle is changing: positive = rotating faster than the path (rear sliding,
oversteer), negative = slower (front washing, understeer). The yaw sign convention is calibrated
from the data. Steady understeer does not show there, so the compare page also reports steer per g
at the apex: more lock for the same lateral g in the same corner = more understeer. The live page
shows the slip rate as a bar; the compare page shows per corner peak lateral g, steer per g and
slide counts, which is what to read before touching a setup lever.

Geometry and telemetry meet in one primitive, `outlineArc` in `analysis.js`: arc-length fraction
of the outline == fraction of lap distance. Corner windows (distance from map position) and the
map cursor (map position from distance) are the two directions of that mapping.

All analysis is in `public/analysis.js`: pure functions over the distance grid, no DOM. The page
only draws. Thresholds (brake on 20%, full throttle 90%, coast 5%) are constants at the top of
that file.

## Track map

Outlines come from the F1 live-timing circuit data served by the MultiViewer API (the same
source the `_binary1702/f1` project uses). They are stored per game trackId in `public/tracks/`
and served at `/tracks/<id>.json`. Austria (trackId 17) is included. To add another circuit:

```bash
node scripts/fetch-track.ts 7      # Silverstone, or "all"
```

The outline is a closed centreline in driving order starting near the start/finish line.
Cars are placed at `lapDistance / trackLength` of the outline's arc length (from Lap Data and
Session packets), so the outline's coordinate units never need to match the game's.

Requires Node 22.18+ (runs `.ts` directly via type stripping, no build step).
