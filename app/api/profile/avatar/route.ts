import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { avatarObjectKeyFromUrl, deleteAvatarKey, uploadAvatar } from "@/lib/avatar-storage";

const MAX_BYTES = 4 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    if (!TYPES.has(file.type)) return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_BYTES) return NextResponse.json({ error: "The image must be 4 MB or smaller." }, { status: 400 });
    const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const jpeg = signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff;
    const png = signature.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10";
    const webp = String.fromCharCode(...signature.slice(0, 4)) === "RIFF" && String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
    if (!(file.type === "image/jpeg" && jpeg) && !(file.type === "image/png" && png) && !(file.type === "image/webp" && webp)) return NextResponse.json({ error: "The selected file contents do not match a supported image." }, { status: 400 });
    const previous = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { avatarUrl: true } });
    const uploaded = await uploadAvatar(session.user.id, file);
    let profile;
    try {
      profile = await prisma.profile.update({ where: { userId: session.user.id }, data: { avatarUrl: uploaded.url } });
    } catch (error) {
      await deleteAvatarKey(uploaded.key).catch(() => undefined);
      throw error;
    }
    const previousKey = avatarObjectKeyFromUrl(previous?.avatarUrl);
    if (previousKey) await deleteAvatarKey(previousKey).catch((error) => console.warn("Old profile photo cleanup failed:", error));
    return NextResponse.json({ avatarUrl: profile.avatarUrl });
  } catch (error) {
    console.error("Avatar upload failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to upload profile photo." }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const profile = await prisma.profile.findUnique({ where: { userId: session.user.id }, select: { avatarUrl: true } });
    const key = avatarObjectKeyFromUrl(profile?.avatarUrl);
    await prisma.profile.update({ where: { userId: session.user.id }, data: { avatarUrl: null } });
    if (key) await deleteAvatarKey(key).catch((error) => console.warn("Profile photo cleanup failed:", error));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Avatar removal failed:", error);
    return NextResponse.json({ error: "Unable to remove profile photo." }, { status: 500 });
  }
}
