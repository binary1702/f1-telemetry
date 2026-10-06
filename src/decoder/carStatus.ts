// F1 25 Car Status packet (packetId 7). Source: "Data Output from F1 25 v3".
//
// PacketCarStatusData: header (29) + CarStatusData[22] (22 * 55) = 1239 bytes
//
// CarStatusData (55 bytes), offsets relative to the car entry:
//   0   uint8   m_tractionControl         0 off, 1 medium, 2 full
//   1   uint8   m_antiLockBrakes
//   2   uint8   m_fuelMix                 0 lean, 1 standard, 2 rich, 3 max
//   3   uint8   m_frontBrakeBias          %
//   4   uint8   m_pitLimiterStatus
//   5   float   m_fuelInTank              kg
//   9   float   m_fuelCapacity            kg
//  13   float   m_fuelRemainingLaps       laps (MFD value)
//  17   uint16  m_maxRPM
//  19   uint16  m_idleRPM
//  21   uint8   m_maxGears
//  22   uint8   m_drsAllowed
//  23   uint16  m_drsActivationDistance   metres, 0 = not available
//  25   uint8   m_actualTyreCompound
//  26   uint8   m_visualTyreCompound      16 soft, 17 medium, 18 hard, 7 inter, 8 wet
//  27   uint8   m_tyresAgeLaps
//  28   int8    m_vehicleFiaFlags
//  29   float   m_enginePowerICE          W
//  33   float   m_enginePowerMGUK         W
//  37   float   m_ersStoreEnergy          J (max 4 MJ)
//  41   uint8   m_ersDeployMode           0 none, 1 medium, 2 hotlap, 3 overtake
//  42   float   m_ersHarvestedThisLapMGUK
//  46   float   m_ersHarvestedThisLapMGUH
//  50   float   m_ersDeployedThisLap
//  54   uint8   m_networkPaused
//  55 = total

import { HEADER_SIZE } from "./header.ts";

export const CAR_STATUS_SIZE = 55;
export const CAR_STATUS_PACKET_SIZE = HEADER_SIZE + 22 * CAR_STATUS_SIZE; // 1239

const VISUAL_COMPOUND: Record<number, string> = { 16: "SOFT", 17: "MEDIUM", 18: "HARD", 7: "INTER", 8: "WET" };
const FUEL_MIX = ["LEAN", "STD", "RICH", "MAX"];
const ERS_MODE = ["NONE", "MEDIUM", "HOTLAP", "OVERTAKE"];

export interface CarStatus {
  fuelKg: number;
  fuelCapacityKg: number;
  fuelLaps: number; // laps of fuel remaining, as shown on the MFD (negative = short)
  fuelMix: string;
  tyreCompound: string;
  tyreAgeLaps: number;
  ersStoreJ: number;
  ersMode: string;
  drsAllowed: boolean;
  drsActivationDistance: number;
  maxRpm: number;
  brakeBias: number;
}

export function parseCarStatus(buf: Buffer, playerCarIndex: number): CarStatus | null {
  if (buf.length !== CAR_STATUS_PACKET_SIZE) return null;
  const b = HEADER_SIZE + playerCarIndex * CAR_STATUS_SIZE;
  const visual = buf.readUInt8(b + 26);
  return {
    fuelKg: buf.readFloatLE(b + 5),
    fuelCapacityKg: buf.readFloatLE(b + 9),
    fuelLaps: buf.readFloatLE(b + 13),
    fuelMix: FUEL_MIX[buf.readUInt8(b + 2)] ?? "?",
    tyreCompound: VISUAL_COMPOUND[visual] ?? `C${visual}`,
    tyreAgeLaps: buf.readUInt8(b + 27),
    ersStoreJ: buf.readFloatLE(b + 37),
    ersMode: ERS_MODE[buf.readUInt8(b + 41)] ?? "?",
    drsAllowed: buf.readUInt8(b + 22) === 1,
    drsActivationDistance: buf.readUInt16LE(b + 23),
    maxRpm: buf.readUInt16LE(b + 17),
    brakeBias: buf.readUInt8(b + 3),
  };
}
