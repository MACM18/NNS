import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicPushConfiguration, removeWebPushSubscription, saveWebPushSubscription } from "@/lib/web-push-service";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [configuration, activeDevices] = await Promise.all([
    Promise.resolve(publicPushConfiguration()),
    prisma.webPushSubscription.count({ where: { userId: session.user.id } }),
  ]);
  return NextResponse.json({ ...configuration, activeDevices }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!publicPushConfiguration().available) {
    return NextResponse.json({ error: "Browser notifications have not been configured by the administrator." }, { status: 503 });
  }
  try {
    await saveWebPushSubscription(session.user.id, await request.json());
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not enable browser notifications." }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    if (typeof body.endpoint !== "string") return NextResponse.json({ error: "A browser subscription is required." }, { status: 400 });
    await removeWebPushSubscription(session.user.id, body.endpoint);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Could not disable browser notifications." }, { status: 400 });
  }
}
