import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Transform to snake_case for frontend compatibility
    const transformed = posts.map((p: any) => ({
      id: p.id,
      title: p.title,
      content: p.content,
      excerpt: p.excerpt,
      author: p.author,
      category: p.category,
      tags: p.tags,
      featured_image_url: p.featuredImageUrl,
      status: p.status,
      created_at: p.createdAt,
      updated_at: p.updatedAt,
    }));

    return NextResponse.json({ data: transformed });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const post = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        excerpt: body.excerpt,
        category: body.category,
        tags: body.tags,
        featuredImageUrl: body.image_url ?? body.featuredImageUrl ?? null,
        status: body.status || "active",
        author: session.user.name ?? "Unknown",
      },
    });

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("Error creating post:", error);
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    );
  }
}
