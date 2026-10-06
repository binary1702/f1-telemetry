// F1 25 Car Setups packet (packetId 5). Source: "Data Output from F1 25 v3".
// Frequency 2 Hz. In multiplayer only your own car's setup is populated.
//
// PacketCarSetupData: header (29) + CarSetupData[22] (22 * 50) + float m_nextFrontWingValue = 1133 bytes
//
// CarSetupData (50 bytes), offsets relative to the car entry:
//   0   uint8  m_frontWing
//   1   uint8  m_rearWing
//   2   uint8  m_onThrottle             diff, %
//   3   uint8  m_offThrottle            diff, %
//   4   float  m_frontCamber
//   8   float  m_rearCamber
//  12   float  m_frontToe
//  16   float  m_rearToe
//  20   uint8  m_frontSuspension
//  21   uint8  m_rearSuspension
//  22   uint8  m_frontAntiRollBar
//  23   uint8  m_rearAntiRollBar
//  24   uint8  m_frontSuspensionHeight
//  25   uint8  m_rearSuspensionHeight
//  26   uint8  m_brakePressure          %
//  27   uint8  m_brakeBias              %
//  28   uint8  m_engineBraking          %
//  29   float  m_rearLeftTyrePressure   PSI
//  33   float  m_rearRightTyrePressure
//  37   float  m_frontLeftTyrePressure
//  41   float  m_frontRightTyrePressure
//  45   uint8  m_ballast
//  46   float  m_fuelLoad
//  50 = total

import { createHash } from "node:crypto";
import { HEADER_SIZE } from "./header.ts";

export const CAR_SETUP_SIZE = 50;
export const CAR_SETUPS_PACKET_SIZE = HEADER_SIZE + 22 * CAR_SETUP_SIZE + 4; // 1133

export interface CarSetup {
  frontWing: number;
  rearWing: number;
  diffOnThrottle: number;
  diffOffThrottle: number;
  frontCamber: number;
  rearCamber: number;
  frontToe: number;
  rearToe: number;
  frontSuspension: number;
  rearSuspension: number;
  frontAntiRollBar: number;
  rearAntiRollBar: number;
  frontRideHeight: number;
  rearRideHeight: number;
  brakePressure: number;
  brakeBias: number;
  engineBraking: number;
  tyrePressure: [rl: number, rr: number, fl: number, fr: number];
  ballast: number;
  fuelLoad: number;
  hash: string; // short fingerprint of every field except fuelLoad, so laps can be grouped by setup
}

export function parseCarSetups(buf: Buffer, playerCarIndex: number): CarSetup | null {
  if (buf.length !== CAR_SETUPS_PACKET_SIZE) return null;
  const b = HEADER_SIZE + playerCarIndex * CAR_SETUP_SIZE;
  const s = {
    frontWing: buf.readUInt8(b + 0),
    rearWing: buf.readUInt8(b + 1),
    diffOnThrottle: buf.readUInt8(b + 2),
    diffOffThrottle: buf.readUInt8(b + 3),
    frontCamber: round(buf.readFloatLE(b + 4)),
    rearCamber: round(buf.readFloatLE(b + 8)),
    frontToe: round(buf.readFloatLE(b + 12)),
    rearToe: round(buf.readFloatLE(b + 16)),
    frontSuspension: buf.readUInt8(b + 20),
    rearSuspension: buf.readUInt8(b + 21),
    frontAntiRollBar: buf.readUInt8(b + 22),
    rearAntiRollBar: buf.readUInt8(b + 23),
    frontRideHeight: buf.readUInt8(b + 24),
    rearRideHeight: buf.readUInt8(b + 25),
    brakePressure: buf.readUInt8(b + 26),
    brakeBias: buf.readUInt8(b + 27),
    engineBraking: buf.readUInt8(b + 28),
    tyrePressure: [
      round(buf.readFloatLE(b + 29)),
      round(buf.readFloatLE(b + 33)),
      round(buf.readFloatLE(b + 37)),
      round(buf.readFloatLE(b + 41)),
    ] as [number, number, number, number],
    ballast: buf.readUInt8(b + 45),
  };
  const hash = createHash("sha1").update(JSON.stringify(s)).digest("hex").slice(0, 8);
  return { ...s, fuelLoad: round(buf.readFloatLE(b + 46)), hash };
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
