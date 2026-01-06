import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const blog = await prisma.blog.findUnique({
      where: { id: parseInt(id) },
    });

    if (!blog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    return NextResponse.json({ data: blog });
  } catch (error) {
    console.error("Error fetching blog:", error);
    return NextResponse.json(
      { error: "Failed to fetch blog" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const dataToUpdate: Record<string, unknown> = {};
    if (body.title !== undefined) dataToUpdate.title = body.title;
    if (body.content !== undefined) dataToUpdate.content = body.content;
    if (body.excerpt !== undefined) dataToUpdate.excerpt = body.excerpt;
    if (body.author !== undefined) dataToUpdate.author = body.author;
    if (body.category !== undefined) dataToUpdate.category = body.category;
    if (body.status !== undefined) dataToUpdate.status = body.status;
    if (body.slug !== undefined) dataToUpdate.slug = body.slug;
    if (body.meta_description !== undefined)
      dataToUpdate.metaDescription = body.meta_description;
    if (body.reading_time !== undefined)
      dataToUpdate.readingTime = body.reading_time;
    if (
      body.published_at !== undefined &&
      body.published_at !== null &&
      body.published_at !== ""
    )
      dataToUpdate.publishedAt = new Date(body.published_at);
    if (body.tags !== undefined)
      dataToUpdate.tags = Array.isArray(body.tags)
        ? body.tags
        : String(body.tags)
            .split(",")
            .map((s) => s.trim());
    if (body.featured_image_url !== undefined)
      dataToUpdate.featuredImageUrl = body.featured_image_url;

    const blog = await prisma.blog.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });

    const transformed = {
      id: blog.id,
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt,
      author: blog.author,
      category: blog.category,
      tags: blog.tags,
      featured_image_url: blog.featuredImageUrl,
      slug: blog.slug,
      meta_description: blog.metaDescription,
      reading_time: blog.readingTime,
      status: blog.status,
      published_at: blog.publishedAt,
      created_at: blog.createdAt,
      updated_at: blog.updatedAt,
    };

    return NextResponse.json({ data: transformed });
  } catch (error) {
    console.error("Error updating blog:", error);
    return NextResponse.json(
      { error: "Failed to update blog" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.blog.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog:", error);
    return NextResponse.json(
      { error: "Failed to delete blog" },
      { status: 500 }
    );
  }
}
