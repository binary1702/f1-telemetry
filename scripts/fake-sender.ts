// Sends synthetic F1 25 packets (Session, Motion, LapData, CarTelemetry) to localhost:20777 at 20 Hz.
// Lets you verify decoder + WebSocket + browser without the PS5.
// Builds every packet byte-for-byte from the spec so it also checks the offsets.
// 22 cars drive around a fake oval-ish circuit; the player is car index 3.

import dgram from "node:dgram";
import { HEADER_SIZE } from "../src/decoder/header.ts";
import { CAR_COUNT, CAR_TELEMETRY_SIZE, CAR_TELEMETRY_PACKET_SIZE } from "../src/decoder/carTelemetry.ts";
import { CAR_MOTION_SIZE, MOTION_PACKET_SIZE } from "../src/decoder/motion.ts";
import { LAP_DATA_SIZE, LAP_DATA_PACKET_SIZE } from "../src/decoder/lapData.ts";
import { SESSION_PACKET_SIZE } from "../src/decoder/session.ts";
import { CAR_STATUS_SIZE, CAR_STATUS_PACKET_SIZE } from "../src/decoder/carStatus.ts";
import { CAR_SETUP_SIZE, CAR_SETUPS_PACKET_SIZE } from "../src/decoder/carSetups.ts";
import { SESSION_HISTORY_PACKET_SIZE } from "../src/decoder/sessionHistory.ts";

const PLAYER_CAR_INDEX = 3; // deliberately not 0, to prove playerCarIndex is honoured
const UDP_PORT = Number(process.env.F1_UDP_PORT ?? 20777);
const TRACK_LENGTH = 4318; // Austria, metres
const LAP_SECONDS = Number(process.env.FAKE_LAP_SECONDS ?? 70); // shorten to test the lap recorder quickly

const socket = dgram.createSocket("udp4");
let frame = 0;

function header(buf: Buffer, packetId: number): void {
  buf.writeUInt16LE(2025, 0);
  buf.writeUInt8(25, 2);
  buf.writeUInt8(1, 3);
  buf.writeUInt8(0, 4);
  buf.writeUInt8(1, 5);
  buf.writeUInt8(packetId, 6);
  buf.writeBigUInt64LE(0x1234n, 7);
  buf.writeFloatLE(frame / 20, 15);
  buf.writeUInt32LE(frame, 19);
  buf.writeUInt32LE(frame, 23);
  buf.writeUInt8(PLAYER_CAR_INDEX, 27);
  buf.writeUInt8(255, 28);
}

// Laps completed (fractional) for car i at the current frame. Cars are staggered.
function lapsDone(i: number): number {
  return frame / 20 / LAP_SECONDS + i * 0.04;
}
function lapFraction(i: number): number {
  return lapsDone(i) % 1;
}
function lapNum(i: number): number {
  return 1 + Math.floor(lapsDone(i));
}

// A bean-shaped closed curve in metres, roughly circuit-sized.
function circuitPoint(f: number): { x: number; z: number; yaw: number } {
  const a = f * Math.PI * 2;
  const x = 600 * Math.cos(a) + 150 * Math.cos(2 * a);
  const z = 400 * Math.sin(a) + 100 * Math.sin(3 * a);
  const dx = -600 * Math.sin(a) - 300 * Math.sin(2 * a);
  const dz = 400 * Math.cos(a) + 300 * Math.cos(3 * a);
  return { x, z, yaw: Math.atan2(dx, dz) };
}

function sessionPacket(): Buffer {
  const buf = Buffer.alloc(SESSION_PACKET_SIZE);
  header(buf, 1);
  buf.writeUInt8(0, 29); // weather
  buf.writeInt8(38, 30); // track temp
  buf.writeInt8(24, 31); // air temp
  buf.writeUInt8(5, 32); // total laps
  buf.writeUInt16LE(TRACK_LENGTH, 33);
  buf.writeUInt8(15, 35); // session type: race
  buf.writeInt8(17, 36); // Austria
  return buf;
}

function motionPacket(): Buffer {
  const buf = Buffer.alloc(MOTION_PACKET_SIZE);
  header(buf, 0);
  for (let i = 0; i < CAR_COUNT; i++) {
    const base = HEADER_SIZE + i * CAR_MOTION_SIZE;
    if (i >= 20) continue; // two inactive cars stay at 0,0
    const p = circuitPoint(lapFraction(i));
    buf.writeFloatLE(p.x, base + 0);
    buf.writeFloatLE(0, base + 4);
    buf.writeFloatLE(p.z, base + 8);
    buf.writeFloatLE(p.yaw, base + 48);
    if (i === PLAYER_CAR_INDEX) {
      buf.writeFloatLE(Math.sin(frame / 10) * 3, base + 36);
      buf.writeFloatLE(Math.cos(frame / 10) * 2, base + 40);
    }
  }
  return buf;
}

function lapPacket(): Buffer {
  const buf = Buffer.alloc(LAP_DATA_PACKET_SIZE);
  header(buf, 2);
  const order = [...Array(20).keys()].sort((a, b) => lapsDone(b) - lapsDone(a)); // active cars only
  for (let i = 0; i < CAR_COUNT; i++) {
    const base = HEADER_SIZE + i * LAP_DATA_SIZE;
    const active = i < 20;
    const f = lapFraction(i);
    const n = lapNum(i);
    const lapMs = LAP_SECONDS * 1000 + ((n * 7919 + i * 137) % 900); // varies per lap, so bests are meaningful
    const s1 = Math.round(lapMs * 0.33), s2 = Math.round(lapMs * 0.34);
    buf.writeUInt32LE(n > 1 ? LAP_SECONDS * 1000 + (((n - 1) * 7919 + i * 137) % 900) : 0, base + 0); // last lap
    buf.writeUInt32LE(Math.round(f * lapMs), base + 4); // current lap
    buf.writeUInt16LE(f > 1 / 3 ? s1 % 60000 : 0, base + 8); buf.writeUInt8(f > 1 / 3 ? Math.floor(s1 / 60000) : 0, base + 10);
    buf.writeUInt16LE(f > 2 / 3 ? s2 % 60000 : 0, base + 11); buf.writeUInt8(f > 2 / 3 ? Math.floor(s2 / 60000) : 0, base + 13);
    buf.writeUInt16LE(1234, base + 14); buf.writeUInt8(0, base + 16); // delta front
    buf.writeUInt16LE(5678, base + 17); buf.writeUInt8(1, base + 19); // delta leader 1:05.678
    buf.writeFloatLE(f * TRACK_LENGTH, base + 20);
    buf.writeUInt8(active ? order.indexOf(i) + 1 : 0, base + 32);
    buf.writeUInt8(n, base + 33);
    buf.writeUInt8(0, base + 34);
    buf.writeUInt8(Math.min(2, Math.floor(f * 3)), base + 36);
    buf.writeUInt8(i === PLAYER_CAR_INDEX && n % 3 === 0 ? 1 : 0, base + 37); // every third lap invalid
    buf.writeUInt8(active ? 2 : 1, base + 45);
  }
  buf.writeUInt8(255, LAP_DATA_PACKET_SIZE - 2);
  buf.writeUInt8(255, LAP_DATA_PACKET_SIZE - 1);
  return buf;
}

function telemetryPacket(): Buffer {
  const buf = Buffer.alloc(CAR_TELEMETRY_PACKET_SIZE);
  header(buf, 6);
  for (let i = 0; i < CAR_COUNT; i++) {
    const base = HEADER_SIZE + i * CAR_TELEMETRY_SIZE;
    buf.writeUInt16LE(50 + i, base + 0);
    buf.writeFloatLE(0.1, base + 2);
    buf.writeFloatLE(0, base + 6);
    buf.writeFloatLE(0.9, base + 10);
    buf.writeInt8(2, base + 15);
    buf.writeUInt16LE(4000, base + 16);
    buf.writeUInt8(0, base + 18);
  }
  const t = frame / 20;
  const base = HEADER_SIZE + PLAYER_CAR_INDEX * CAR_TELEMETRY_SIZE;
  const throttle = (Math.sin(t) + 1) / 2;
  buf.writeUInt16LE(Math.round(100 + throttle * 220), base + 0);
  buf.writeFloatLE(throttle, base + 2);
  buf.writeFloatLE(Math.sin(t / 2), base + 6);
  buf.writeFloatLE(1 - throttle, base + 10);
  buf.writeInt8(1 + Math.floor(throttle * 7), base + 15);
  buf.writeUInt16LE(Math.round(5000 + throttle * 7000), base + 16);
  buf.writeUInt8(throttle > 0.8 ? 1 : 0, base + 18);
  // wheel arrays: RL, RR, FL, FR
  const temps = [95, 98, 88, 112];
  temps.forEach((v, w) => {
    buf.writeUInt16LE(400 + w * 50, base + 22 + w * 2); // brake temp
    buf.writeUInt8(v + Math.round(Math.sin(t + w) * 5), base + 30 + w); // surface
    buf.writeUInt8(v + 8, base + 34 + w); // inner
    buf.writeFloatLE(22.5 + w * 0.3, base + 40 + w * 4); // pressure
  });
  buf.writeUInt16LE(108, base + 38); // engine temp
  buf.writeUInt8(255, 1349);
  buf.writeUInt8(255, 1350);
  buf.writeInt8(0, 1351);
  return buf;
}

function statusPacket(): Buffer {
  const buf = Buffer.alloc(CAR_STATUS_PACKET_SIZE);
  header(buf, 7);
  const t = frame / 20;
  for (let i = 0; i < CAR_COUNT; i++) {
    const b = HEADER_SIZE + i * CAR_STATUS_SIZE;
    buf.writeUInt8(1, b + 2); // fuel mix standard
    buf.writeUInt8(56, b + 3); // brake bias
    buf.writeFloatLE(Math.max(0, 40 - t * 0.05), b + 5); // fuel kg, draining
    buf.writeFloatLE(110, b + 9);
    buf.writeFloatLE(1.8 - t * 0.002, b + 13); // fuel laps
    buf.writeUInt16LE(13000, b + 17);
    buf.writeUInt8(1, b + 22); // drs allowed
    buf.writeUInt8(17, b + 26); // medium
    buf.writeUInt8(lapNum(i), b + 27); // tyre age
    buf.writeFloatLE(4e6 * ((Math.sin(t / 5) + 1) / 2), b + 37); // ERS store
    buf.writeUInt8(1, b + 41); // ERS medium
  }
  return buf;
}

function setupsPacket(): Buffer {
  const buf = Buffer.alloc(CAR_SETUPS_PACKET_SIZE);
  header(buf, 5);
  const b = HEADER_SIZE + PLAYER_CAR_INDEX * CAR_SETUP_SIZE;
  buf.writeUInt8(28, b + 0); buf.writeUInt8(30, b + 1); // wings
  buf.writeUInt8(55, b + 2); buf.writeUInt8(50, b + 3); // diff
  buf.writeFloatLE(-3.0, b + 4); buf.writeFloatLE(-1.5, b + 8); // camber
  buf.writeFloatLE(0.05, b + 12); buf.writeFloatLE(0.2, b + 16); // toe
  buf.writeUInt8(30, b + 20); buf.writeUInt8(12, b + 21); // suspension
  buf.writeUInt8(9, b + 22); buf.writeUInt8(14, b + 23); // ARB
  buf.writeUInt8(24, b + 24); buf.writeUInt8(60, b + 25); // ride height
  buf.writeUInt8(100, b + 26); buf.writeUInt8(56, b + 27); buf.writeUInt8(50, b + 28); // brakes, engine braking
  [22.5, 22.5, 24.0, 24.0].forEach((v, w) => buf.writeFloatLE(v, b + 29 + w * 4)); // RL RR FL FR
  buf.writeUInt8(6, b + 45);
  buf.writeFloatLE(32.5, b + 46);
  buf.writeFloatLE(28, CAR_SETUPS_PACKET_SIZE - 4);
  return buf;
}

function historyPacket(): Buffer {
  const buf = Buffer.alloc(SESSION_HISTORY_PACKET_SIZE);
  header(buf, 11);
  const i = PLAYER_CAR_INDEX;
  const n = lapNum(i);
  buf.writeUInt8(i, 29);
  buf.writeUInt8(n, 30);
  buf.writeUInt8(1, 31);
  buf.writeUInt8(1, 32); buf.writeUInt8(1, 33); buf.writeUInt8(1, 34); buf.writeUInt8(1, 35);
  for (let k = 1; k < n && k <= 100; k++) {
    const b = HEADER_SIZE + 7 + (k - 1) * 14;
    const lapMs = LAP_SECONDS * 1000 + ((k * 7919 + i * 137) % 900);
    const s1 = Math.round(lapMs * 0.33), s2 = Math.round(lapMs * 0.34), s3 = lapMs - s1 - s2;
    buf.writeUInt32LE(lapMs, b);
    buf.writeUInt16LE(s1 % 60000, b + 4); buf.writeUInt8(Math.floor(s1 / 60000), b + 6);
    buf.writeUInt16LE(s2 % 60000, b + 7); buf.writeUInt8(Math.floor(s2 / 60000), b + 9);
    buf.writeUInt16LE(s3 % 60000, b + 10); buf.writeUInt8(Math.floor(s3 / 60000), b + 12);
    buf.writeUInt8(k % 3 === 0 ? 0x0e : 0x0f, b + 13);
  }
  return buf;
}

setInterval(() => {
  if (frame % 10 === 0) socket.send(sessionPacket(), UDP_PORT, "127.0.0.1"); // 2 Hz
  if (frame % 10 === 5) socket.send(setupsPacket(), UDP_PORT, "127.0.0.1"); // 2 Hz
  if (frame % 20 === 0) socket.send(historyPacket(), UDP_PORT, "127.0.0.1"); // ~1 Hz for the player
  socket.send(statusPacket(), UDP_PORT, "127.0.0.1");
  socket.send(motionPacket(), UDP_PORT, "127.0.0.1");
  socket.send(lapPacket(), UDP_PORT, "127.0.0.1");
  socket.send(telemetryPacket(), UDP_PORT, "127.0.0.1");
  frame++;
}, 50);

console.log(`[fake] sending Session/Motion/LapData/CarTelemetry to 127.0.0.1:${UDP_PORT} at 20 Hz, playerCarIndex=${PLAYER_CAR_INDEX}`);
