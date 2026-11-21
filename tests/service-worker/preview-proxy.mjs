import { createServer, request as requestUpstream } from "node:http";

/** A test-only origin in front of real preview builds; SW fetches pass through it too. */
export async function createPreviewProxy({ port, backendPort }) {
  let unavailable = false;
  let heldResource = null;
  const heldResponses = new Set();
  const sockets = new Set();
  const requests = [];

  function forward(request, response) {
    const upstream = requestUpstream(
      {
        hostname: "127.0.0.1",
        port: backendPort,
        method: request.method,
        path: request.url,
        headers: { ...request.headers, host: `127.0.0.1:${backendPort}` },
      },
      (upstreamResponse) => {
        response.writeHead(
          upstreamResponse.statusCode,
          upstreamResponse.headers,
        );
        upstreamResponse.pipe(response);
        upstreamResponse.on("error", () => response.destroy());
      },
    );
    // Connection failures are deliberately exposed to the browser, never replaced by HTML.
    upstream.on("error", () => response.destroy());
    response.once("close", () => upstream.destroy());
    request.pipe(upstream);
  }

  const server = createServer((request, response) => {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    requests.push({
      url: pathname,
      destination: request.headers["sec-fetch-dest"] ?? null,
    });
    if (unavailable) {
      request.socket.destroy();
      return;
    }
    if (pathname === heldResource) {
      heldResponses.add(response);
      response.once("close", () => heldResponses.delete(response));
      return;
    }
    forward(request, response);
  });
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  return {
    get requests() {
      return [...requests];
    },
    clearRequests() {
      requests.length = 0;
    },
    setUnavailable(value) {
      unavailable = value;
      if (value) {
        // Drop in-flight downloads as well as subsequent requests.
        for (const socket of sockets) socket.destroy();
      }
    },
    holdResource(pathname) {
      heldResource = pathname;
    },
    get pendingResourceRequests() {
      return heldResponses.size;
    },
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
