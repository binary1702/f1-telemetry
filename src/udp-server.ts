// UDP listener. Receives raw datagrams from F1 25 and hands them to a callback.
// No decoding here: this module only knows about bytes.

import dgram from "node:dgram";

export const UDP_PORT = Number(process.env.F1_UDP_PORT ?? 20777);

export function startUdpServer(onDatagram: (buf: Buffer) => void): dgram.Socket {
  const socket = dgram.createSocket("udp4");

  socket.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `[F1 UDP] port ${UDP_PORT} already in use. Is "nc -u -l ${UDP_PORT}" still running? Stop it and retry.`,
      );
    } else {
      console.error("[F1 UDP] socket error:", err);
    }
    process.exit(1);
  });

  socket.on("message", (msg) => onDatagram(msg));

  socket.on("listening", () => {
    const addr = socket.address();
    console.log(`[F1 UDP] listening on ${addr.address}:${addr.port}`);
  });

  socket.bind(UDP_PORT, "0.0.0.0");
  return socket;
}
