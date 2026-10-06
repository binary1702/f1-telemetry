// Downloads a circuit outline from the MultiViewer API and stores it as public/tracks/<gameTrackId>.json.
// The outline is a closed centreline in driving order, starting near the start/finish line,
// in units of roughly 0.1 m. Cars are placed on it by lap distance, so units never need converting.
//
//   node scripts/fetch-track.ts 17        # Austria
//   node scripts/fetch-track.ts all

import { writeFileSync, mkdirSync } from "node:fs";

// Game trackId (F1 25 spec appendix) -> MultiViewer / F1 Live Timing circuit key.
const CIRCUIT_KEYS: Record<number, number> = {
  0: 10, // Melbourne
  2: 49, // Shanghai
  3: 63, // Sakhir
  4: 15, // Catalunya
  5: 22, // Monaco
  6: 23, // Montreal
  7: 2, // Silverstone
  9: 4, // Hungaroring
  10: 7, // Spa
  11: 39, // Monza
  12: 61, // Singapore
  13: 46, // Suzuka
  14: 70, // Abu Dhabi
  15: 9, // Texas (COTA)
  16: 14, // Brazil (Interlagos)
  17: 19, // Austria (Spielberg)
  19: 65, // Mexico
  20: 144, // Baku
  26: 55, // Zandvoort
  27: 6, // Imola
  29: 149, // Jeddah
  30: 151, // Miami
  31: 152, // Las Vegas
  32: 150, // Losail
};

const YEAR = 2025;

async function fetchTrack(trackId: number): Promise<boolean> {
  const key = CIRCUIT_KEYS[trackId];
  if (key === undefined) {
    console.error(`no circuit key for game trackId ${trackId}`);
    return false;
  }
  const url = `https://api.multiviewer.app/api/v1/circuits/${key}/${YEAR}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`trackId ${trackId}: ${url} -> HTTP ${res.status}`);
    return false;
  }
  const d = (await res.json()) as {
    circuitName: string;
    x: number[];
    y: number[];
    rotation: number;
    corners: { number: number; trackPosition: { x: number; y: number } }[];
  };
  const out = {
    trackId,
    circuitKey: key,
    name: d.circuitName,
    rotation: d.rotation ?? 0,
    x: d.x,
    y: d.y,
    corners: d.corners.map((c) => ({ n: c.number, x: c.trackPosition.x, y: c.trackPosition.y })),
  };
  mkdirSync("public/tracks", { recursive: true });
  writeFileSync(`public/tracks/${trackId}.json`, JSON.stringify(out));
  console.log(`trackId ${trackId}: ${d.circuitName}, ${d.x.length} points, ${out.corners.length} corners -> public/tracks/${trackId}.json`);
  return true;
}

const arg = process.argv[2];
if (!arg) {
  console.error("usage: node scripts/fetch-track.ts <gameTrackId|all>");
  process.exit(1);
}
const ids = arg === "all" ? Object.keys(CIRCUIT_KEYS).map(Number) : [Number(arg)];
for (const id of ids) await fetchTrack(id);
