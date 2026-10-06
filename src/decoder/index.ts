// Entry point for the decoder: raw datagram in, typed result out.
// Each packet type lives in its own module; add new ones here.

import { parseHeader, PacketId, type PacketHeader } from "./header.ts";
import { parsePlayerCarTelemetry, CAR_TELEMETRY_PACKET_SIZE, type Telemetry } from "./carTelemetry.ts";
import { parseMotion, type Motion } from "./motion.ts";
import { parseLapData, type LapInfo } from "./lapData.ts";
import { parseSession, type Session } from "./session.ts";
import { parseCarStatus, type CarStatus } from "./carStatus.ts";
import { parseCarSetups, type CarSetup } from "./carSetups.ts";
import { parseSessionHistory, type SessionHistory } from "./sessionHistory.ts";

export type DecodedPacket =
  | { kind: "carTelemetry"; header: PacketHeader; telemetry: Telemetry }
  | { kind: "motion"; header: PacketHeader; motion: Motion }
  | { kind: "lapData"; header: PacketHeader; lap: LapInfo }
  | { kind: "session"; header: PacketHeader; session: Session }
  | { kind: "carStatus"; header: PacketHeader; status: CarStatus }
  | { kind: "carSetups"; header: PacketHeader; setup: CarSetup }
  | { kind: "sessionHistory"; header: PacketHeader; history: SessionHistory }
  | { kind: "other"; header: PacketHeader }
  | { kind: "invalid"; reason: string };

export function decode(buf: Buffer): DecodedPacket {
  const header = parseHeader(buf);
  if (!header) return { kind: "invalid", reason: `datagram too short (${buf.length} bytes)` };
  if (header.packetFormat !== 2025) {
    return { kind: "invalid", reason: `unexpected packetFormat ${header.packetFormat} (expected 2025)` };
  }
  const idx = header.playerCarIndex;
  if (idx >= 22) return { kind: "invalid", reason: `bad playerCarIndex ${idx}` };

  switch (header.packetId) {
    case PacketId.CarTelemetry: {
      if (buf.length !== CAR_TELEMETRY_PACKET_SIZE) {
        return { kind: "invalid", reason: `CarTelemetry size ${buf.length}, expected ${CAR_TELEMETRY_PACKET_SIZE}` };
      }
      const telemetry = parsePlayerCarTelemetry(buf, header);
      if (!telemetry) return { kind: "invalid", reason: "CarTelemetry parse failed" };
      return { kind: "carTelemetry", header, telemetry };
    }
    case PacketId.Motion: {
      const motion = parseMotion(buf, idx);
      if (!motion) return { kind: "invalid", reason: `Motion size ${buf.length}` };
      return { kind: "motion", header, motion };
    }
    case PacketId.LapData: {
      const lap = parseLapData(buf, idx);
      if (!lap) return { kind: "invalid", reason: `LapData size ${buf.length}` };
      return { kind: "lapData", header, lap };
    }
    case PacketId.Session: {
      const session = parseSession(buf);
      if (!session) return { kind: "invalid", reason: `Session size ${buf.length}` };
      return { kind: "session", header, session };
    }
    case PacketId.CarStatus: {
      const status = parseCarStatus(buf, idx);
      if (!status) return { kind: "invalid", reason: `CarStatus size ${buf.length}` };
      return { kind: "carStatus", header, status };
    }
    case PacketId.CarSetups: {
      const setup = parseCarSetups(buf, idx);
      if (!setup) return { kind: "invalid", reason: `CarSetups size ${buf.length}` };
      return { kind: "carSetups", header, setup };
    }
    case PacketId.SessionHistory: {
      const history = parseSessionHistory(buf);
      if (!history) return { kind: "invalid", reason: `SessionHistory size ${buf.length}` };
      return { kind: "sessionHistory", header, history };
    }
    default:
      return { kind: "other", header };
  }
}

export { PacketId, packetName } from "./header.ts";
export type { PacketHeader } from "./header.ts";
export type { Telemetry, Wheels } from "./carTelemetry.ts";
export type { Motion, CarPosition } from "./motion.ts";
export type { LapInfo, PlayerLap, CarLap } from "./lapData.ts";
export type { Session } from "./session.ts";
export type { CarStatus } from "./carStatus.ts";
export type { CarSetup } from "./carSetups.ts";
export type { SessionHistory, HistoryLap } from "./sessionHistory.ts";
