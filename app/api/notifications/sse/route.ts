import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { registerSseClient, unregisterSseClient } from "@/lib/sse-manager";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Register client connection wrapper
  const client = {
    send: (data: any) => {
      try {
        writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      } catch (err) {
        console.error(`Error sending data to client ${userId}:`, err);
      }
    },
    close: () => {
      try {
        writer.close();
      } catch {}
    }
  };

  registerSseClient(userId, client);

  // Send initial keep-alive comment
  writer.write(encoder.encode(": keepalive\n\n"));

  // Keep-alive interval to prevent timeout (every 30s)
  const keepAliveInterval = setInterval(() => {
    try {
      writer.write(encoder.encode(": keepalive\n\n"));
    } catch {
      clearInterval(keepAliveInterval);
      unregisterSseClient(userId, client);
    }
  }, 30000);

  req.signal.addEventListener("abort", () => {
    clearInterval(keepAliveInterval);
    unregisterSseClient(userId, client);
    client.close();
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
