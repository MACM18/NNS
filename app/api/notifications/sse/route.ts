import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const userId = session.user.id;
  const requestedSince = new Date(req.nextUrl.searchParams.get("since") || "");
  let cursor = Number.isNaN(requestedSince.getTime())
    ? new Date(Date.now() - 60_000)
    : requestedSince;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let polling = false;
      let pollInterval: ReturnType<typeof setInterval>;
      const sentIds = new Set<string>();
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(pollInterval);
        req.signal.removeEventListener("abort", close);
        try { controller.close(); } catch { /* already closed */ }
      };
      const send = (message: string) => {
        if (closed) return;
        try { controller.enqueue(encoder.encode(message)); } catch { close(); }
      };
      const poll = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const rows = await prisma.notification.findMany({
            where: { userId, createdAt: { gte: cursor } },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            take: 500,
          });
          for (const notification of rows) {
            if (sentIds.has(notification.id)) continue;
            sentIds.add(notification.id);
            send(`id: ${notification.id}\ndata: ${JSON.stringify({
              id: notification.id,
              user_id: notification.userId,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              category: notification.category,
              is_read: notification.isRead,
              action_url: notification.actionUrl,
              metadata: notification.metadata,
              created_at: notification.createdAt,
              updated_at: notification.updatedAt,
            })}\n\n`);
            if (notification.createdAt > cursor) cursor = notification.createdAt;
          }
          // Keep memory bounded on long-lived dashboard sessions.
          if (sentIds.size > 1000) sentIds.clear();
        } catch (error) {
          console.error("[notifications/sse] Could not poll notifications:", error);
        } finally {
          polling = false;
        }
      };

      send("retry: 5000\n: connected\n\n");
      pollInterval = setInterval(() => void poll(), 10_000);
      req.signal.addEventListener("abort", close, { once: true });
      void poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
