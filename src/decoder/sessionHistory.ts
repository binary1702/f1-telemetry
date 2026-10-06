// F1 25 Session History packet (packetId 11). Source: "Data Output from F1 25 v3".
// One packet per car, cycling; each car roughly once a second. Size 1460 bytes.
//
// offset (absolute)  type   field
//  29                uint8  m_carIdx
//  30                uint8  m_numLaps                 including the current partial lap
//  31                uint8  m_numTyreStints
//  32                uint8  m_bestLapTimeLapNum
//  33                uint8  m_bestSector1LapNum
//  34                uint8  m_bestSector2LapNum
//  35                uint8  m_bestSector3LapNum
//  36                LapHistoryData[100]             14 bytes each
//  1436              TyreStintHistoryData[8]         3 bytes each
//  1460 = total
//
// LapHistoryData (14 bytes):
//   0   uint32  m_lapTimeInMS
//   4   uint16  m_sector1TimeMSPart
//   6   uint8   m_sector1TimeMinutesPart
//   7   uint16  m_sector2TimeMSPart
//   9   uint8   m_sector2TimeMinutesPart
//  10   uint16  m_sector3TimeMSPart
//  12   uint8   m_sector3TimeMinutesPart
//  13   uint8   m_lapValidBitFlags    0x01 lap, 0x02 S1, 0x04 S2, 0x08 S3

import { HEADER_SIZE } from "./header.ts";

export const SESSION_HISTORY_PACKET_SIZE = 1460;
const LAP_HISTORY_SIZE = 14;
const LAPS_OFFSET = HEADER_SIZE + 7;

export interface HistoryLap {
  lapNum: number; // 1-based
  lapTimeMs: number;
  sectorsMs: [number, number, number];
  valid: boolean;
}

export interface SessionHistory {
  carIdx: number;
  numLaps: number;
  bestLapNum: number;
  bestSectorLapNum: [number, number, number];
  laps: HistoryLap[]; // completed laps only (lapTimeMs > 0)
}

export function parseSessionHistory(buf: Buffer): SessionHistory | null {
  if (buf.length !== SESSION_HISTORY_PACKET_SIZE) return null;
  const numLaps = buf.readUInt8(30);
  const laps: HistoryLap[] = [];
  for (let i = 0; i < Math.min(numLaps, 100); i++) {
    const b = LAPS_OFFSET + i * LAP_HISTORY_SIZE;
    const lapTimeMs = buf.readUInt32LE(b);
    if (lapTimeMs === 0) continue;
    laps.push({
      lapNum: i + 1,
      lapTimeMs,
      sectorsMs: [
        buf.readUInt16LE(b + 4) + buf.readUInt8(b + 6) * 60000,
        buf.readUInt16LE(b + 7) + buf.readUInt8(b + 9) * 60000,
        buf.readUInt16LE(b + 10) + buf.readUInt8(b + 12) * 60000,
      ],
      valid: (buf.readUInt8(b + 13) & 0x01) !== 0,
    });
  }
  return {
    carIdx: buf.readUInt8(29),
    numLaps,
    bestLapNum: buf.readUInt8(32),
    bestSectorLapNum: [buf.readUInt8(33), buf.readUInt8(34), buf.readUInt8(35)],
    laps,
  };
}
