// F1 25 Lap Data packet (packetId 2). Source: "Data Output from F1 25 v3".
//
// PacketLapData: header (29) + LapData[22] (22 * 57) + 2 trailing uint8 = 1285 bytes
//
// LapData (57 bytes), offsets relative to the car entry:
//   0   uint32  m_lastLapTimeInMS
//   4   uint32  m_currentLapTimeInMS
//   8   uint16  m_sector1TimeMSPart
//  10   uint8   m_sector1TimeMinutesPart
//  11   uint16  m_sector2TimeMSPart
//  13   uint8   m_sector2TimeMinutesPart
//  14   uint16  m_deltaToCarInFrontMSPart
//  16   uint8   m_deltaToCarInFrontMinutesPart
//  17   uint16  m_deltaToRaceLeaderMSPart
//  19   uint8   m_deltaToRaceLeaderMinutesPart
//  20   float   m_lapDistance            metres, negative before crossing the line
//  24   float   m_totalDistance
//  28   float   m_safetyCarDelta
//  32   uint8   m_carPosition
//  33   uint8   m_currentLapNum
//  34   uint8   m_pitStatus              0 none, 1 pitting, 2 in pit area
//  35   uint8   m_numPitStops
//  36   uint8   m_sector                 0, 1, 2
//  37   uint8   m_currentLapInvalid      0 valid, 1 invalid
//  38   uint8   m_penalties
//  39   uint8   m_totalWarnings
//  40   uint8   m_cornerCuttingWarnings
//  41   uint8   m_numUnservedDriveThroughPens
//  42   uint8   m_numUnservedStopGoPens
//  43   uint8   m_gridPosition
//  44   uint8   m_driverStatus           0 garage, 1 flying, 2 in lap, 3 out lap, 4 on track
//  45   uint8   m_resultStatus           0 invalid, 1 inactive, 2 active, 3 finished, ...
//  46   uint8   m_pitLaneTimerActive
//  47   uint16  m_pitLaneTimeInLaneInMS
//  49   uint16  m_pitStopTimerInMS
//  51   uint8   m_pitStopShouldServePen
//  52   float   m_speedTrapFastestSpeed
//  56   uint8   m_speedTrapFastestLap
//  57 = total

import { HEADER_SIZE } from "./header.ts";

export const LAP_DATA_SIZE = 57;
export const LAP_DATA_PACKET_SIZE = HEADER_SIZE + 22 * LAP_DATA_SIZE + 2; // 1285

export interface CarLap {
  position: number; // race position
  lapNum: number;
  lapDistance: number; // metres
  active: boolean; // resultStatus 2 (active) or 3 (finished)
  inPits: boolean;
}

export interface PlayerLap extends CarLap {
  lastLapMs: number;
  currentLapMs: number;
  sector: number; // 0..2
  sector1Ms: number; // this lap's S1 once set, else 0
  sector2Ms: number;
  lapInvalid: boolean;
  deltaToFrontMs: number;
  deltaToLeaderMs: number;
}

export interface LapInfo {
  cars: CarLap[];
  player: PlayerLap;
}

function parseCar(buf: Buffer, base: number): CarLap {
  const resultStatus = buf.readUInt8(base + 45);
  return {
    position: buf.readUInt8(base + 32),
    lapNum: buf.readUInt8(base + 33),
    lapDistance: buf.readFloatLE(base + 20),
    active: resultStatus === 2 || resultStatus === 3,
    inPits: buf.readUInt8(base + 34) !== 0,
  };
}

export function parseLapData(buf: Buffer, playerCarIndex: number): LapInfo | null {
  if (buf.length !== LAP_DATA_PACKET_SIZE) return null;
  const cars: CarLap[] = [];
  for (let i = 0; i < 22; i++) cars.push(parseCar(buf, HEADER_SIZE + i * LAP_DATA_SIZE));

  const p = HEADER_SIZE + playerCarIndex * LAP_DATA_SIZE;
  const player: PlayerLap = {
    ...cars[playerCarIndex],
    lastLapMs: buf.readUInt32LE(p + 0),
    currentLapMs: buf.readUInt32LE(p + 4),
    sector: buf.readUInt8(p + 36),
    sector1Ms: buf.readUInt16LE(p + 8) + buf.readUInt8(p + 10) * 60000,
    sector2Ms: buf.readUInt16LE(p + 11) + buf.readUInt8(p + 13) * 60000,
    lapInvalid: buf.readUInt8(p + 37) === 1,
    deltaToFrontMs: buf.readUInt16LE(p + 14) + buf.readUInt8(p + 16) * 60000,
    deltaToLeaderMs: buf.readUInt16LE(p + 17) + buf.readUInt8(p + 19) * 60000,
  };
  return { cars, player };
}
