import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const blogs = await prisma.blog.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      { error: "Failed to fetch blogs" },
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

    const blog = await prisma.blog.create({
      data: {
        title: body.title,
        content: body.content,
        excerpt: body.excerpt ?? null,
        category: body.category ?? null,
        tags: Array.isArray(body.tags) ? body.tags : [],
        featuredImageUrl: body.image_url ?? body.featuredImageUrl ?? null,
        status: body.status || "active",
        author: session.user.name || session.user.email || "Unknown",
        slug: body.slug ?? null,
        metaDescription: body.metaDescription ?? null,
        readingTime: body.readingTime ?? null,
        publishedAt: body.publishedAt ? new Date(body.publishedAt) : null,
      },
    });

    return NextResponse.json({ data: blog });
  } catch (error) {
    console.error("Error creating blog:", error);
    return NextResponse.json(
      { error: "Failed to create blog" },
      { status: 500 }
    );
  }
}
