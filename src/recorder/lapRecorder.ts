// Lap recorder. Turns the live packet stream into one file per completed lap.
//
// The invariant: a lap is a function of DISTANCE. Every sample is keyed by lapDistance (from Lap
// Data), joined with the Car Telemetry frame of the same frameIdentifier. On completion the lap is
// resampled onto a fixed distance grid so any two laps of the same track are directly comparable
// index for index.
//
// State machine (player car only):
//   idle ──first LapData──▶ recording(lapNum)
//   recording ──lapNum increments──▶ finalize previous lap, write file, start recording(lapNum+1)
//   recording ──lapDistance drops sharply──▶ flashback: truncate samples past the new distance
//   recording ──lapNum decreases / session changes──▶ discard buffer, start fresh

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PacketHeader, Telemetry, LapInfo, Session, CarStatus, CarSetup, Motion } from "../decoder/index.ts";

export const GRID_STEP_M = 5;

export interface LapSample {
  d: number; // lapDistance, metres
  t: number; // currentLapTime, ms
  speed: number;
  throttle: number;
  brake: number;
  steer: number;
  gear: number;
  rpm: number;
  drs: number; // 0/1
  gLat: number;
  gLong: number;
  yawRate: number; // rad/s, from consecutive Motion packets
  x: number; // player world position (metres), for the racing line
  z: number;
}

export interface LapGrid {
  stepM: number;
  d: number[];
  t: number[];
  speed: number[];
  throttle: number[];
  brake: number[];
  steer: number[];
  gear: number[];
  gLat: number[];
  gLong: number[];
  yawRate: number[];
  x: number[];
  z: number[];
}

export interface LapRecord {
  version: 1;
  recordedAt: string;
  sessionUID: string;
  sessionType: string;
  track: { id: number; name: string; length: number };
  lapNum: number;
  lapTimeMs: number;
  sectorsMs: [number, number, number];
  valid: boolean;
  flags: string[]; // "invalid" | "pit" | "flashback" | "incomplete"
  tags: {
    compound: string;
    tyreAgeLaps: number;
    fuelStartKg: number;
    fuelEndKg: number;
    ersMode: string;
    setupHash: string | null;
  };
  setup: CarSetup | null;
  grid: LapGrid;
  samples: LapSample[];
}

export interface LapSummary {
  lapNum: number;
  lapTimeMs: number;
  sectorsMs: [number, number, number];
  valid: boolean;
  flags: string[];
  compound: string;
  tyreAgeLaps: number;
  setupHash: string | null;
  file: string;
}

interface LapBuffer {
  lapNum: number;
  samples: LapSample[];
  invalid: boolean;
  pit: boolean;
  flashback: boolean;
  fuelStartKg: number;
  compound: string;
  tyreAgeLaps: number;
  ersMode: string;
}

export class LapRecorder {
  private lapsDir: string;
  private onLap: (summary: LapSummary) => void;

  private session: Session | null = null;
  private sessionUID = "";
  private status: CarStatus | null = null;
  private setup: CarSetup | null = null;
  private latestTelemetry: { frame: number; t: Telemetry } | null = null;
  private latestG: { lat: number; long: number; yawRate: number } = { lat: 0, long: 0, yawRate: 0 };
  private latestPos: { x: number; z: number } = { x: 0, z: 0 };
  private prevPlayer: LapInfo["player"] | null = null;
  private buf: LapBuffer | null = null;

  readonly summaries: LapSummary[] = [];

  private onSessionLaps: (summaries: LapSummary[]) => void;

  constructor(lapsDir: string, onLap: (summary: LapSummary) => void, onSessionLaps: (summaries: LapSummary[]) => void = () => {}) {
    this.lapsDir = lapsDir;
    this.onLap = onLap;
    this.onSessionLaps = onSessionLaps;
  }

  // Laps already on disk for this session (the server may have restarted mid-session).
  private recoverSummaries(s: Session, uid: string): LapSummary[] {
    const dir = path.join(this.lapsDir, `${s.trackId}-${slug(s.trackName)}`, uid);
    if (!existsSync(dir)) return [];
    const out: LapSummary[] = [];
    for (const name of readdirSync(dir).sort()) {
      if (!/^lap-\d+-.*\.json$/.test(name)) continue;
      try {
        const r = JSON.parse(readFileSync(path.join(dir, name), "utf8")) as LapRecord;
        out.push({
          lapNum: r.lapNum, lapTimeMs: r.lapTimeMs, sectorsMs: r.sectorsMs, valid: r.valid, flags: r.flags,
          compound: r.tags.compound, tyreAgeLaps: r.tags.tyreAgeLaps, setupHash: r.tags.setupHash,
          file: path.relative(process.cwd(), path.join(dir, name)),
        });
      } catch { /* skip unreadable file */ }
    }
    return out;
  }

  onSession(s: Session, header: PacketHeader): void {
    const uid = header.sessionUID.toString();
    if (uid !== this.sessionUID) {
      // New session: drop any partial lap, start clean.
      this.sessionUID = uid;
      this.buf = null;
      this.prevPlayer = null;
      this.summaries.length = 0;
      this.summaries.push(...this.recoverSummaries(s, uid));
      console.log(`[REC] session ${uid} · ${s.trackName} · ${s.sessionTypeName}` + (this.summaries.length ? ` · ${this.summaries.length} laps recovered from disk` : ""));
      this.onSessionLaps(this.summaries);
    }
    this.session = s;
  }

  onStatus(s: CarStatus): void {
    this.status = s;
  }

  onSetup(s: CarSetup): void {
    if (!this.setup || this.setup.hash !== s.hash) console.log(`[REC] setup ${s.hash}: FW ${s.frontWing} RW ${s.rearWing} bias ${s.brakeBias}`);
    this.setup = s;
  }

  onTelemetry(t: Telemetry, header: PacketHeader): void {
    this.latestTelemetry = { frame: header.frameIdentifier, t };
  }

  onMotion(m: Motion, yawRate: number, playerCarIndex = 0): void {
    this.latestG = { lat: m.gLat, long: m.gLong, yawRate };
    const c = m.cars[playerCarIndex];
    if (c) this.latestPos = { x: c.x, z: c.z };
  }

  onLapData(lap: LapInfo, header: PacketHeader): void {
    const p = lap.player;

    // Lap boundary
    if (this.buf && p.lapNum !== this.buf.lapNum) {
      if (p.lapNum === this.buf.lapNum + 1 && this.prevPlayer) {
        this.finalize(p.lastLapMs, this.prevPlayer);
      } else {
        console.log(`[REC] lap counter jumped ${this.buf.lapNum} -> ${p.lapNum}, discarding buffer`);
      }
      this.buf = null;
    }

    if (!this.buf) {
      this.buf = {
        lapNum: p.lapNum,
        samples: [],
        invalid: false,
        pit: false,
        flashback: false,
        fuelStartKg: this.status?.fuelKg ?? 0,
        compound: this.status?.tyreCompound ?? "?",
        tyreAgeLaps: this.status?.tyreAgeLaps ?? 0,
        ersMode: this.status?.ersMode ?? "?",
      };
    }

    const b = this.buf;
    b.invalid ||= p.lapInvalid;
    b.pit ||= p.inPits;

    // Flashback: distance went backwards by more than a car length within the same lap.
    const last = b.samples[b.samples.length - 1];
    if (last && p.lapDistance < last.d - 30) {
      const keep = b.samples.filter((s) => s.d < p.lapDistance);
      console.log(`[REC] flashback on lap ${b.lapNum}: ${last.d.toFixed(0)} m -> ${p.lapDistance.toFixed(0)} m, dropped ${b.samples.length - keep.length} samples`);
      b.samples = keep;
      b.flashback = true;
    }

    // Join with the telemetry frame. Telemetry and Lap Data are emitted for the same frame.
    const tel = this.latestTelemetry;
    if (tel && Math.abs(tel.frame - header.frameIdentifier) <= 1 && (!last || p.lapDistance > last.d)) {
      const t = tel.t;
      b.samples.push({
        d: p.lapDistance,
        t: p.currentLapMs,
        speed: t.speed,
        throttle: t.throttle,
        brake: t.brake,
        steer: t.steer,
        gear: t.gear,
        rpm: t.rpm,
        drs: t.drs ? 1 : 0,
        gLat: this.latestG.lat,
        gLong: this.latestG.long,
        yawRate: this.latestG.yawRate,
        x: this.latestPos.x,
        z: this.latestPos.z,
      });
    }

    this.prevPlayer = p;
  }

  private finalize(lapTimeMs: number, lastSeen: LapInfo["player"]): void {
    const b = this.buf!;
    const session = this.session;
    if (!session || lapTimeMs === 0) {
      console.log(`[REC] lap ${b.lapNum}: no session/lap time, not written`);
      return;
    }
    const flags: string[] = [];
    if (b.invalid) flags.push("invalid");
    if (b.pit) flags.push("pit");
    if (b.flashback) flags.push("flashback");
    const coverage = b.samples.length ? (b.samples[b.samples.length - 1].d - Math.max(0, b.samples[0].d)) / session.trackLength : 0;
    if (coverage < 0.9) flags.push("incomplete");

    const s1 = lastSeen.sector1Ms, s2 = lastSeen.sector2Ms;
    const sectorsMs: [number, number, number] = [s1, s2, Math.max(0, lapTimeMs - s1 - s2)];

    const record: LapRecord = {
      version: 1,
      recordedAt: new Date().toISOString(),
      sessionUID: this.sessionUID,
      sessionType: session.sessionTypeName,
      track: { id: session.trackId, name: session.trackName, length: session.trackLength },
      lapNum: b.lapNum,
      lapTimeMs,
      sectorsMs,
      valid: flags.length === 0,
      flags,
      tags: {
        compound: b.compound,
        tyreAgeLaps: b.tyreAgeLaps,
        fuelStartKg: b.fuelStartKg,
        fuelEndKg: this.status?.fuelKg ?? 0,
        ersMode: b.ersMode,
        setupHash: this.setup?.hash ?? null,
      },
      setup: this.setup,
      grid: resample(b.samples, session.trackLength),
      samples: b.samples,
    };

    const dir = path.join(this.lapsDir, `${session.trackId}-${slug(session.trackName)}`, this.sessionUID);
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `lap-${String(b.lapNum).padStart(3, "0")}-${fmt(lapTimeMs)}.json`);
    writeFileSync(file, JSON.stringify(record));

    const summary: LapSummary = {
      lapNum: b.lapNum,
      lapTimeMs,
      sectorsMs,
      valid: record.valid,
      flags,
      compound: b.compound,
      tyreAgeLaps: b.tyreAgeLaps,
      setupHash: record.tags.setupHash,
      file: path.relative(process.cwd(), file),
    };
    this.summaries.push(summary);
    console.log(`[REC] lap ${b.lapNum} ${fmt(lapTimeMs)} [${sectorsMs.map(fmt).join(" | ")}] ${flags.join(",") || "valid"} · ${b.samples.length} samples -> ${summary.file}`);
    this.onLap(summary);
  }
}

// Linear interpolation of every channel onto a fixed distance grid (gear: nearest sample).
function resample(samples: LapSample[], trackLength: number): LapGrid {
  const n = Math.floor(trackLength / GRID_STEP_M) + 1;
  const grid: LapGrid = { stepM: GRID_STEP_M, d: [], t: [], speed: [], throttle: [], brake: [], steer: [], gear: [], gLat: [], gLong: [], yawRate: [], x: [], z: [] };
  if (samples.length < 2) return grid;
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = i * GRID_STEP_M;
    if (d < samples[0].d || d > samples[samples.length - 1].d) continue; // outside recorded range
    while (j < samples.length - 2 && samples[j + 1].d < d) j++;
    const a = samples[j], c = samples[j + 1];
    const f = c.d === a.d ? 0 : (d - a.d) / (c.d - a.d);
    const lerp = (x: number, y: number) => x + (y - x) * f;
    grid.d.push(d);
    grid.t.push(Math.round(lerp(a.t, c.t)));
    grid.speed.push(Math.round(lerp(a.speed, c.speed) * 10) / 10);
    grid.throttle.push(Math.round(lerp(a.throttle, c.throttle) * 1000) / 1000);
    grid.brake.push(Math.round(lerp(a.brake, c.brake) * 1000) / 1000);
    grid.steer.push(Math.round(lerp(a.steer, c.steer) * 1000) / 1000);
    grid.gear.push(f < 0.5 ? a.gear : c.gear);
    grid.gLat.push(Math.round(lerp(a.gLat, c.gLat) * 100) / 100);
    grid.gLong.push(Math.round(lerp(a.gLong, c.gLong) * 100) / 100);
    grid.yawRate.push(Math.round(lerp(a.yawRate ?? 0, c.yawRate ?? 0) * 1000) / 1000);
    grid.x.push(Math.round(lerp(a.x ?? 0, c.x ?? 0) * 100) / 100);
    grid.z.push(Math.round(lerp(a.z ?? 0, c.z ?? 0) * 100) / 100);
  }
  return grid;
}

function fmt(ms: number): string {
  const m = Math.floor(ms / 60000), s = ((ms % 60000) / 1000).toFixed(3).padStart(6, "0");
  return `${m}m${s}`;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
