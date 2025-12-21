import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const post = await prisma.post.findUnique({
      where: { id: parseInt(id) },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json(
      { error: "Failed to fetch post" },
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

    // Whitelist and map incoming update fields
    const dataToUpdate: any = {};
    if (body.title !== undefined) dataToUpdate.title = body.title;
    if (body.content !== undefined) dataToUpdate.content = body.content;
    if (body.excerpt !== undefined) dataToUpdate.excerpt = body.excerpt;
    if (body.author !== undefined) dataToUpdate.author = body.author;
    if (body.category !== undefined) dataToUpdate.category = body.category;
    if (body.status !== undefined) dataToUpdate.status = body.status;
    // tags can be array or comma string
    if (body.tags !== undefined)
      dataToUpdate.tags = Array.isArray(body.tags)
        ? body.tags
        : String(body.tags)
            .split(",")
            .map((s) => s.trim());
    if (body.featured_image_url !== undefined)
      dataToUpdate.featuredImageUrl = body.featured_image_url;
    else if (body.featuredImageUrl !== undefined)
      dataToUpdate.featuredImageUrl = body.featuredImageUrl;

    const post = await prisma.post.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
    });

    // return transformed snake_case
    const transformed = {
      id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      author: post.author,
      category: post.category,
      tags: post.tags,
      featured_image_url: post.featuredImageUrl,
      status: post.status,
      created_at: post.createdAt,
      updated_at: post.updatedAt,
    };

    return NextResponse.json({ data: transformed });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json(
      { error: "Failed to update post" },
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

    await prisma.post.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json(
      { error: "Failed to delete post" },
      { status: 500 }
    );
  }
}
