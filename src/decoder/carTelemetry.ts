// F1 25 Car Telemetry packet (packetId 6). Source: "Data Output from F1 25 v3".
//
// PacketCarTelemetryData:
//   PacketHeader       m_header                 29 bytes   offset 0
//   CarTelemetryData   m_carTelemetryData[22]   22 * 60    offset 29
//   uint8              m_mfdPanelIndex                     offset 1349
//   uint8              m_mfdPanelIndexSecondaryPlayer      offset 1350
//   int8               m_suggestedGear                     offset 1351
//   total = 1352 bytes
//
// CarTelemetryData (60 bytes), offsets relative to the start of the car entry:
//   0   uint16   m_speed                       km/h
//   2   float    m_throttle                    0.0 .. 1.0
//   6   float    m_steer                       -1.0 (left) .. 1.0 (right)
//  10   float    m_brake                       0.0 .. 1.0
//  14   uint8    m_clutch                      0 .. 100
//  15   int8     m_gear                        1-8, N=0, R=-1
//  16   uint16   m_engineRPM
//  18   uint8    m_drs                         0 = off, 1 = on
//  19   uint8    m_revLightsPercent
//  20   uint16   m_revLightsBitValue
//  22   uint16   m_brakesTemperature[4]        celsius
//  30   uint8    m_tyresSurfaceTemperature[4]  celsius
//  34   uint8    m_tyresInnerTemperature[4]    celsius
//  38   uint16   m_engineTemperature           celsius
//  40   float    m_tyresPressure[4]            PSI
//  56   uint8    m_surfaceType[4]
//  60 = total
//
// All wheel arrays are ordered: 0 = RL, 1 = RR, 2 = FL, 3 = FR (spec appendix).

import { HEADER_SIZE, type PacketHeader } from "./header.ts";

export const CAR_COUNT = 22;
export const CAR_TELEMETRY_SIZE = 60;
export const CAR_TELEMETRY_PACKET_SIZE = HEADER_SIZE + CAR_COUNT * CAR_TELEMETRY_SIZE + 3; // 1352

export type Wheels = [rl: number, rr: number, fl: number, fr: number];

export interface Telemetry {
  speed: number; // km/h
  gear: number; // -1 = R, 0 = N, 1..8
  rpm: number;
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1
  drs: boolean;
  tyreSurfaceTemp: Wheels; // celsius
  tyreInnerTemp: Wheels; // celsius
  brakeTemp: Wheels; // celsius
  tyrePressure: Wheels; // PSI
  engineTemp: number; // celsius
}

function u8x4(buf: Buffer, at: number): Wheels {
  return [buf.readUInt8(at), buf.readUInt8(at + 1), buf.readUInt8(at + 2), buf.readUInt8(at + 3)];
}
function u16x4(buf: Buffer, at: number): Wheels {
  return [buf.readUInt16LE(at), buf.readUInt16LE(at + 2), buf.readUInt16LE(at + 4), buf.readUInt16LE(at + 6)];
}
function f32x4(buf: Buffer, at: number): Wheels {
  return [buf.readFloatLE(at), buf.readFloatLE(at + 4), buf.readFloatLE(at + 8), buf.readFloatLE(at + 12)];
}

function parseCar(buf: Buffer, base: number): Telemetry {
  return {
    speed: buf.readUInt16LE(base + 0),
    throttle: buf.readFloatLE(base + 2),
    steer: buf.readFloatLE(base + 6),
    brake: buf.readFloatLE(base + 10),
    gear: buf.readInt8(base + 15),
    rpm: buf.readUInt16LE(base + 16),
    drs: buf.readUInt8(base + 18) === 1,
    brakeTemp: u16x4(buf, base + 22),
    tyreSurfaceTemp: u8x4(buf, base + 30),
    tyreInnerTemp: u8x4(buf, base + 34),
    engineTemp: buf.readUInt16LE(base + 38),
    tyrePressure: f32x4(buf, base + 40),
  };
}

// Returns the player's car telemetry, located via header.playerCarIndex.
export function parsePlayerCarTelemetry(buf: Buffer, header: PacketHeader): Telemetry | null {
  const idx = header.playerCarIndex;
  if (idx < 0 || idx >= CAR_COUNT) return null;
  const base = HEADER_SIZE + idx * CAR_TELEMETRY_SIZE;
  if (buf.length < base + CAR_TELEMETRY_SIZE) return null;
  return parseCar(buf, base);
}
