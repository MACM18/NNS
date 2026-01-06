import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Supabase auth exchange is deprecated. Use NextAuth." },
    { status: 410 }
  );
}
