// F1 25 UDP PacketHeader. Source: "Data Output from F1 25 v3" (EA/Codemasters).
// All values little-endian, packed (no padding).
//
// offset  size  type    field
//   0      2    uint16  m_packetFormat            (2025)
//   2      1    uint8   m_gameYear
//   3      1    uint8   m_gameMajorVersion
//   4      1    uint8   m_gameMinorVersion
//   5      1    uint8   m_packetVersion
//   6      1    uint8   m_packetId
//   7      8    uint64  m_sessionUID
//  15      4    float   m_sessionTime
//  19      4    uint32  m_frameIdentifier
//  23      4    uint32  m_overallFrameIdentifier
//  27      1    uint8   m_playerCarIndex
//  28      1    uint8   m_secondaryPlayerCarIndex (255 = none)
//  29  = total

export const HEADER_SIZE = 29;

export const PacketId = {
  Motion: 0,
  Session: 1,
  LapData: 2,
  Event: 3,
  Participants: 4,
  CarSetups: 5,
  CarTelemetry: 6,
  CarStatus: 7,
  FinalClassification: 8,
  LobbyInfo: 9,
  CarDamage: 10,
  SessionHistory: 11,
  TyreSets: 12,
  MotionEx: 13,
  TimeTrial: 14,
  LapPositions: 15,
} as const;

export type PacketIdValue = (typeof PacketId)[keyof typeof PacketId];

const PACKET_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(PacketId).map(([name, id]) => [id, name]),
);

export function packetName(id: number): string {
  return PACKET_NAMES[id] ?? `Unknown(${id})`;
}

export interface PacketHeader {
  packetFormat: number;
  gameYear: number;
  gameMajorVersion: number;
  gameMinorVersion: number;
  packetVersion: number;
  packetId: number;
  sessionUID: bigint;
  sessionTime: number;
  frameIdentifier: number;
  overallFrameIdentifier: number;
  playerCarIndex: number;
  secondaryPlayerCarIndex: number;
}

export function parseHeader(buf: Buffer): PacketHeader | null {
  if (buf.length < HEADER_SIZE) return null;
  return {
    packetFormat: buf.readUInt16LE(0),
    gameYear: buf.readUInt8(2),
    gameMajorVersion: buf.readUInt8(3),
    gameMinorVersion: buf.readUInt8(4),
    packetVersion: buf.readUInt8(5),
    packetId: buf.readUInt8(6),
    sessionUID: buf.readBigUInt64LE(7),
    sessionTime: buf.readFloatLE(15),
    frameIdentifier: buf.readUInt32LE(19),
    overallFrameIdentifier: buf.readUInt32LE(23),
    playerCarIndex: buf.readUInt8(27),
    secondaryPlayerCarIndex: buf.readUInt8(28),
  };
}
