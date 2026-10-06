// Wires it together:
//   UDP :20777 -> decode() -> typed message -> WebSocket broadcast -> browser
//                         └-> LapRecorder -> laps/<track>/<session>/lap-NNN.json
// Also serves public/ over HTTP so one process does everything.
//
// Wire format (JSON, one object per WebSocket message):
//   { type: "telemetry",    data: Telemetry }
//   { type: "motion",       data: { player: number, cars: CarPosition[], gLat, gLong } }
//   { type: "lap",          data: LapInfo }
//   { type: "session",      data: Session }
//   { type: "status",       data: CarStatus }
//   { type: "setup",        data: CarSetup }
//   { type: "history",      data: SessionHistory }        (player car only)
//   { type: "laps",         data: LapSummary[] }          (all recorded laps this session)
//   { type: "lapCompleted", data: LapSummary }

import http from "node:http";
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { WebSocketServer, WebSocket } from "ws";

import { startUdpServer } from "./udp-server.ts";
import { decode, packetName } from "./decoder/index.ts";
import { LapRecorder } from "./recorder/lapRecorder.ts";

const HTTP_PORT = Number(process.env.PORT ?? 3000);
const LAPS_DIR = process.env.LAPS_DIR ?? "laps";
const VERBOSE_FIRST_N = 5; // full per-packet logs for the first N telemetry packets
const SUMMARY_INTERVAL_MS = 1000; // then a 1 Hz summary line

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, "..", "public");

// ---- HTTP + WebSocket ----

const MIME: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".json": "application/json" };

// Lap files on disk, newest first, without the heavy arrays. Used by the compare page.
function listLaps(): object[] {
  const out: { file: string; mtime: number; [k: string]: unknown }[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = path.join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/^lap-\d+-.*\.json$/.test(name)) {
        try {
          const { grid: _g, samples: _s, setup: _st, ...meta } = JSON.parse(readFileSync(p, "utf8"));
          out.push({ ...meta, file: path.relative(LAPS_DIR, p), mtime: statSync(p).mtimeMs });
        } catch { /* skip unreadable file */ }
      }
    }
  };
  walk(LAPS_DIR);
  return out.sort((a, b) => b.mtime - a.mtime);
}

const httpServer = http.createServer((req, res) => {
  const u = new URL(req.url ?? "/", "http://localhost");
  const send = (code: number, type: string, body: string | Buffer) => {
    res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
    res.end(body);
  };

  if (u.pathname === "/api/laps") return send(200, MIME[".json"], JSON.stringify(listLaps()));
  // The reference lap, defined once for every page: the quickest lap on the track with full
  // coverage. ?validOnly=1 additionally requires the game's valid flag (no track limits, no restart).
  if (u.pathname === "/api/reference") {
    const trackId = Number(u.searchParams.get("track"));
    const validOnly = u.searchParams.get("validOnly") === "1";
    const mine = (listLaps() as { track: { id: number }; flags: string[]; valid: boolean; lapTimeMs: number }[])
      .filter((l) => l.track.id === trackId && !l.flags.includes("incomplete") && (!validOnly || l.valid));
    if (!mine.length) return send(404, "text/plain", "no reference lap for this track");
    return send(200, MIME[".json"], JSON.stringify(mine.reduce((a, b) => (b.lapTimeMs < a.lapTimeMs ? b : a))));
  }
  // Save a judged lap report (what the coach page computed) next to the laps: reports/<lap file>.report.json
  if (u.pathname === "/api/report" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const rep = JSON.parse(body) as { lapFile: string };
        if (!rep.lapFile || rep.lapFile.includes("..")) return send(400, "text/plain", "bad lapFile");
        const out = path.join("reports", rep.lapFile.replace(/\.json$/, ".report.json"));
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(out, JSON.stringify({ savedAt: new Date().toISOString(), ...rep }, null, 2));
        send(200, MIME[".json"], JSON.stringify({ saved: out }));
      } catch (e) { send(400, "text/plain", String(e)); }
    });
    return;
  }
  if (u.pathname === "/api/lap") {
    const rel = u.searchParams.get("f") ?? "";
    const file = path.resolve(LAPS_DIR, rel);
    if (!file.startsWith(path.resolve(LAPS_DIR) + path.sep) || !existsSync(file)) return send(404, "text/plain", "no such lap");
    return send(200, MIME[".json"], readFileSync(file));
  }

  // Static files from public/. "/" -> index.html, "/compare" -> compare.html. Read per request so a
  // reload always gets the current file.
  let rel = u.pathname === "/" ? "index.html" : u.pathname.slice(1);
  if (!path.extname(rel)) rel += ".html";
  const file = path.resolve(publicDir, rel);
  if (!file.startsWith(publicDir + path.sep) || !existsSync(file)) {
    const t = /^tracks\/(\d+)\.json$/.exec(rel);
    return send(404, "text/plain", t ? `no outline for trackId ${t[1]}. Run: node scripts/fetch-track.ts ${t[1]}` : "not found");
  }
  send(200, MIME[path.extname(file)] ?? "application/octet-stream", readFileSync(file));
});

const wss = new WebSocketServer({ server: httpServer });

// Last message of each type, replayed to a newly connected client while the stream is fresh.
const latest = new Map<string, string>();
const STALE_MS = 5000;
let lastPacketAt = 0;

wss.on("connection", (ws, req) => {
  console.log(`[WS] client connected from ${req.socket.remoteAddress} (${wss.clients.size} total)`);
  if (Date.now() - lastPacketAt < STALE_MS) for (const payload of latest.values()) ws.send(payload);
  ws.send(JSON.stringify({ type: "laps", data: recorder.summaries }));
  ws.on("close", () => console.log(`[WS] client disconnected (${wss.clients.size} total)`));
});

function broadcast(type: string, data: unknown, remember = true): void {
  const payload = JSON.stringify({ type, data });
  lastPacketAt = Date.now();
  if (remember) latest.set(type, payload);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[HTTP] port ${HTTP_PORT} already in use. Run with PORT=3001 npm run dev (or free the port).`);
  } else {
    console.error("[HTTP] server error:", err);
  }
  process.exit(1);
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`[HTTP] open http://localhost:${HTTP_PORT}`);
});

// ---- Recorder ----

let prevMotion: { yaw: number; t: number } | null = null;
const recorder = new LapRecorder(LAPS_DIR, (summary) => broadcast("lapCompleted", summary, false), (summaries) => broadcast("laps", summaries, false));
console.log(`[REC] writing laps to ${path.resolve(LAPS_DIR)}`);

// ---- UDP -> decoder ----

let telemetryCount = 0;
let datagramCount = 0;
let invalidCount = 0;
const seenPacketIds = new Set<number>();
let lastSummaryAt = Date.now();

startUdpServer((buf) => {
  datagramCount++;
  const result = decode(buf);

  if (result.kind === "invalid") {
    invalidCount++;
    if (invalidCount <= 10) console.warn(`[F1 UDP] invalid packet: ${result.reason}`);
    return;
  }

  const { header } = result;
  if (!seenPacketIds.has(header.packetId)) {
    seenPacketIds.add(header.packetId);
    console.log(
      `[F1 UDP] first ${packetName(header.packetId)} packet: ${buf.length} bytes, ` +
        `format ${header.packetFormat}, game ${header.gameMajorVersion}.${header.gameMinorVersion}, ` +
        `playerCarIndex ${header.playerCarIndex}`,
    );
  }

  switch (result.kind) {
    case "motion": {
      // yaw rate from consecutive Motion packets (unwrapped), using the header's session clock
      const m = result.motion;
      let yawRate = 0;
      if (prevMotion && header.sessionTime > prevMotion.t) {
        let dy = m.yaw - prevMotion.yaw;
        if (dy > Math.PI) dy -= 2 * Math.PI; else if (dy < -Math.PI) dy += 2 * Math.PI;
        yawRate = dy / (header.sessionTime - prevMotion.t);
      }
      prevMotion = { yaw: m.yaw, t: header.sessionTime };
      recorder.onMotion(m, yawRate, header.playerCarIndex);
      broadcast("motion", { player: header.playerCarIndex, ...m, yawRate });
      return;
    }
    case "lapData":
      recorder.onLapData(result.lap, header);
      broadcast("lap", result.lap);
      return;
    case "session":
      recorder.onSession(result.session, header);
      broadcast("session", result.session);
      return;
    case "carStatus":
      recorder.onStatus(result.status);
      broadcast("status", result.status);
      return;
    case "carSetups":
      recorder.onSetup(result.setup);
      broadcast("setup", result.setup);
      return;
    case "sessionHistory":
      if (result.history.carIdx === header.playerCarIndex) broadcast("history", result.history);
      return;
    case "other":
      return;
    case "carTelemetry":
      break;
  }

  const t = result.telemetry;
  telemetryCount++;
  recorder.onTelemetry(t, header);
  broadcast("telemetry", t);

  if (telemetryCount <= VERBOSE_FIRST_N) {
    console.log("[F1 UDP] packet received");
    console.log(`[F1 UDP] packetId: ${packetName(header.packetId)}`);
    console.log(`[F1 UDP] playerCarIndex: ${header.playerCarIndex}`);
    console.log(`[F1 UDP] speed: ${t.speed}`);
    console.log(`[F1 UDP] gear: ${t.gear}`);
    console.log(`[F1 UDP] rpm: ${t.rpm}`);
    console.log(`[F1 UDP] throttle: ${t.throttle.toFixed(2)} brake: ${t.brake.toFixed(2)} steer: ${t.steer.toFixed(2)} drs: ${t.drs}`);
    console.log(`[F1 UDP] tyre surface RL/RR/FL/FR: ${t.tyreSurfaceTemp.join("/")} C`);
    return;
  }

  const now = Date.now();
  if (now - lastSummaryAt >= SUMMARY_INTERVAL_MS) {
    lastSummaryAt = now;
    console.log(
      `[F1 UDP] datagrams=${datagramCount} telemetry=${telemetryCount} invalid=${invalidCount} ` +
        `| car ${header.playerCarIndex}: ${t.speed} km/h gear ${t.gear} rpm ${t.rpm} ` +
        `thr ${t.throttle.toFixed(2)} brk ${t.brake.toFixed(2)} steer ${t.steer.toFixed(2)} drs ${t.drs ? "ON" : "OFF"}`,
    );
  }
});
