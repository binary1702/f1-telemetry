// F1 25 Session packet (packetId 1). Source: "Data Output from F1 25 v3".
// Size: 753 bytes. Only the leading fields are decoded for now.
//
// offset (absolute)  type    field
//  29                uint8   m_weather
//  30                int8    m_trackTemperature
//  31                int8    m_airTemperature
//  32                uint8   m_totalLaps
//  33                uint16  m_trackLength      metres
//  35                uint8   m_sessionType      see SESSION_TYPES
//  36                int8    m_trackId          see TRACK_NAMES

export const SESSION_PACKET_SIZE = 753;

export const TRACK_NAMES: Record<number, string> = {
  0: "Melbourne",
  2: "Shanghai",
  3: "Sakhir (Bahrain)",
  4: "Catalunya",
  5: "Monaco",
  6: "Montreal",
  7: "Silverstone",
  9: "Hungaroring",
  10: "Spa",
  11: "Monza",
  12: "Singapore",
  13: "Suzuka",
  14: "Abu Dhabi",
  15: "Texas",
  16: "Brazil",
  17: "Austria",
  19: "Mexico",
  20: "Baku (Azerbaijan)",
  26: "Zandvoort",
  27: "Imola",
  29: "Jeddah",
  30: "Miami",
  31: "Las Vegas",
  32: "Losail",
  39: "Silverstone (Reverse)",
  40: "Austria (Reverse)",
  41: "Zandvoort (Reverse)",
};

export const SESSION_TYPES: Record<number, string> = {
  0: "Unknown",
  1: "Practice 1",
  2: "Practice 2",
  3: "Practice 3",
  4: "Short Practice",
  5: "Qualifying 1",
  6: "Qualifying 2",
  7: "Qualifying 3",
  8: "Short Qualifying",
  9: "One-Shot Qualifying",
  10: "Sprint Shootout 1",
  11: "Sprint Shootout 2",
  12: "Sprint Shootout 3",
  13: "Short Sprint Shootout",
  14: "One-Shot Sprint Shootout",
  15: "Race",
  16: "Race 2",
  17: "Race 3",
  18: "Time Trial",
};

export interface Session {
  trackId: number;
  trackName: string;
  trackLength: number; // metres
  totalLaps: number;
  trackTemp: number;
  airTemp: number;
  sessionType: number;
  sessionTypeName: string;
}

export function parseSession(buf: Buffer): Session | null {
  if (buf.length !== SESSION_PACKET_SIZE) return null;
  const trackId = buf.readInt8(36);
  const sessionType = buf.readUInt8(35);
  return {
    trackId,
    trackName: TRACK_NAMES[trackId] ?? `Track ${trackId}`,
    trackLength: buf.readUInt16LE(33),
    totalLaps: buf.readUInt8(32),
    trackTemp: buf.readInt8(30),
    airTemp: buf.readInt8(31),
    sessionType,
    sessionTypeName: SESSION_TYPES[sessionType] ?? `Session ${sessionType}`,
  };
}
