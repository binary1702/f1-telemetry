// F1 25 Motion packet (packetId 0). Source: "Data Output from F1 25 v3".
//
// PacketMotionData: header (29) + CarMotionData[22] (22 * 60) = 1349 bytes
//
// CarMotionData (60 bytes), offsets relative to the car entry:
//   0   float  m_worldPositionX    metres
//   4   float  m_worldPositionY    metres (up)
//   8   float  m_worldPositionZ    metres
//  12   float  m_worldVelocityX
//  16   float  m_worldVelocityY
//  20   float  m_worldVelocityZ
//  24   int16  m_worldForwardDirX  normalised, /32767
//  26   int16  m_worldForwardDirY
//  28   int16  m_worldForwardDirZ
//  30   int16  m_worldRightDirX
//  32   int16  m_worldRightDirY
//  34   int16  m_worldRightDirZ
//  36   float  m_gForceLateral
//  40   float  m_gForceLongitudinal
//  44   float  m_gForceVertical
//  48   float  m_yaw               radians
//  52   float  m_pitch
//  56   float  m_roll
//  60 = total

import { HEADER_SIZE } from "./header.ts";

export const CAR_MOTION_SIZE = 60;
export const MOTION_PACKET_SIZE = HEADER_SIZE + 22 * CAR_MOTION_SIZE; // 1349

export interface CarPosition {
  x: number; // world X, metres
  z: number; // world Z, metres (ground plane with X)
  yaw: number; // radians
}

export interface Motion {
  cars: CarPosition[]; // index = car index, length 22
  gLat: number; // player lateral G
  gLong: number; // player longitudinal G
  yaw: number; // player heading, radians
}

export function parseMotion(buf: Buffer, playerCarIndex: number): Motion | null {
  if (buf.length !== MOTION_PACKET_SIZE) return null;
  const cars: CarPosition[] = [];
  for (let i = 0; i < 22; i++) {
    const base = HEADER_SIZE + i * CAR_MOTION_SIZE;
    cars.push({
      x: buf.readFloatLE(base + 0),
      z: buf.readFloatLE(base + 8),
      yaw: buf.readFloatLE(base + 48),
    });
  }
  const p = HEADER_SIZE + playerCarIndex * CAR_MOTION_SIZE;
  return {
    cars,
    gLat: buf.readFloatLE(p + 36),
    gLong: buf.readFloatLE(p + 40),
    yaw: buf.readFloatLE(p + 48),
  };
}
